import struct
import math
import numpy as np
import pygltflib

def euler_to_quaternion(pitch, roll, yaw):
    # pitch (X), roll (Z), yaw (Y) in radians
    cy = math.cos(yaw * 0.5)
    sy = math.sin(yaw * 0.5)
    cp = math.cos(pitch * 0.5)
    sp = math.sin(pitch * 0.5)
    cr = math.cos(roll * 0.5)
    sr = math.sin(roll * 0.5)

    w = cr * cp * cy + sr * sp * sy
    x = sr * cp * cy - cr * sp * sy
    y = cr * sp * cy + sr * cp * sy
    z = cr * cp * sy - sr * sp * cy
    return [float(x), float(y), float(z), float(w)]

def main():
    input_path = 'public/3d-assets/model.glb'
    output_path = 'public/3d-assets/model_rigged.glb'

    print(f"Loading {input_path}...")
    glb = pygltflib.GLTF2().load(input_path)

    # 1. Extract Vertex Positions
    mesh = glb.meshes[0]
    prim = mesh.primitives[0]
    pos_accessor_idx = prim.attributes.POSITION
    pos_accessor = glb.accessors[pos_accessor_idx]
    pos_view = glb.bufferViews[pos_accessor.bufferView]
    
    blob = bytearray(glb.binary_blob())
    
    # Read positions as float32 array
    pos_offset = (pos_view.byteOffset or 0) + (pos_accessor.byteOffset or 0)
    vertex_count = pos_accessor.count
    pos_bytes = blob[pos_offset : pos_offset + vertex_count * 12]
    positions = np.frombuffer(pos_bytes, dtype=np.float32).reshape((vertex_count, 3))
    
    print(f"Vertex count: {vertex_count}")
    min_bounds = positions.min(axis=0)
    max_bounds = positions.max(axis=0)
    print(f"Bounds X: [{min_bounds[0]:.3f}, {max_bounds[0]:.3f}]")
    print(f"Bounds Y: [{min_bounds[1]:.3f}, {max_bounds[1]:.3f}]")
    print(f"Bounds Z: [{min_bounds[2]:.3f}, {max_bounds[2]:.3f}]")

    # 2. Define Bone Hierarchy
    # World positions of 6 joints
    joint_names = [
        "Bone_Root",    # 0: base
        "Bone_Spine",   # 1: lower torso
        "Bone_Chest",   # 2: upper chest
        "Bone_Head",    # 3: head & face
        "Bone_Arm_L",   # 4: left arm / side
        "Bone_Arm_R"    # 5: right arm / side
    ]
    
    joint_world_pos = np.array([
        [0.0, -0.85, 0.0],   # Root
        [0.0, -0.35, 0.0],   # Spine
        [0.0,  0.15, 0.0],   # Chest
        [0.0,  0.65, 0.0],   # Head
        [-0.55, 0.15, 0.0],  # Arm_L
        [ 0.55, 0.15, 0.0]   # Arm_R
    ], dtype=np.float32)

    # Relative transforms
    # Root: at world [0, -0.85, 0]
    # Spine: child of Root, relative [0, 0.50, 0]
    # Chest: child of Spine, relative [0, 0.50, 0]
    # Head: child of Chest, relative [0, 0.50, 0]
    # Arm_L: child of Chest, relative [-0.55, 0.0, 0]
    # Arm_R: child of Chest, relative [0.55, 0.0, 0]

    # 3. Calculate Skin Weights & Joints per Vertex
    joints_0 = np.zeros((vertex_count, 4), dtype=np.uint16)
    weights_0 = np.zeros((vertex_count, 4), dtype=np.float32)

    for i in range(vertex_count):
        p = positions[i]
        x, y, z = p[0], p[1], p[2]

        # Calculate influence weights for each bone
        dists = np.linalg.norm(joint_world_pos - p, axis=1)
        
        # Anatomical weighting rules for clean deformations
        raw_weights = np.zeros(6, dtype=np.float32)

        # Head influence
        if y > 0.40:
            head_factor = np.clip((y - 0.40) / 0.35, 0.0, 1.0)
            raw_weights[3] = 1.0 + head_factor * 3.0

        # Chest influence
        if -0.15 <= y <= 0.55:
            chest_factor = 1.0 - abs(y - 0.15) / 0.40
            raw_weights[2] = max(0.0, chest_factor) * 2.0

        # Spine influence
        if -0.65 <= y <= 0.10:
            spine_factor = 1.0 - abs(y - (-0.35)) / 0.40
            raw_weights[1] = max(0.0, spine_factor) * 2.0

        # Root influence
        if y < -0.40:
            root_factor = np.clip((-0.40 - y) / 0.45, 0.0, 1.0)
            raw_weights[0] = 1.0 + root_factor * 3.0

        # Arm Left influence
        if x < -0.30 and y > -0.20:
            arm_l_factor = np.clip((-x - 0.30) / 0.40, 0.0, 1.0)
            raw_weights[4] = arm_l_factor * 3.5

        # Arm Right influence
        if x > 0.30 and y > -0.20:
            arm_r_factor = np.clip((x - 0.30) / 0.40, 0.0, 1.0)
            raw_weights[5] = arm_r_factor * 3.5

        # Distance fallback
        gaussian = np.exp(- (dists / 0.45) ** 2)
        combined = raw_weights + gaussian * 0.35

        # Pick top 4 joints
        top4_indices = np.argsort(combined)[::-1][:4]
        top4_weights = combined[top4_indices]

        weight_sum = np.sum(top4_weights)
        if weight_sum > 0.0001:
            top4_weights /= weight_sum
        else:
            top4_weights = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)

        joints_0[i] = top4_indices.astype(np.uint16)
        weights_0[i] = top4_weights.astype(np.float32)

    # 4. Generate Inverse Bind Matrices
    # 6 matrices of 16 float32 = 96 floats
    inv_bind_matrices = np.zeros((6, 16), dtype=np.float32)
    for j in range(6):
        wx, wy, wz = joint_world_pos[j]
        # Column-major 4x4 matrix representing translation by (-wx, -wy, -wz)
        # [1, 0, 0, 0,
        #  0, 1, 0, 0,
        #  0, 0, 1, 0,
        #  -wx, -wy, -wz, 1]
        inv_bind_matrices[j] = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            -float(wx), -float(wy), -float(wz), 1.0
        ]

    # 5. Append New Buffer Data (Alignment padded to 4 bytes)
    def append_data(data_bytes):
        nonlocal blob
        # pad to 4-byte boundary
        pad = (4 - (len(blob) % 4)) % 4
        if pad > 0:
            blob.extend(b'\x00' * pad)
        offset = len(blob)
        blob.extend(data_bytes)
        return offset, len(data_bytes)

    # A. Append JOINTS_0 (uint16 vec4)
    joints_bytes = joints_0.tobytes()
    joints_offset, joints_len = append_data(joints_bytes)
    joints_bv_idx = len(glb.bufferViews)
    glb.bufferViews.append(pygltflib.BufferView(
        buffer=0,
        byteOffset=joints_offset,
        byteLength=joints_len,
        target=pygltflib.ARRAY_BUFFER
    ))
    joints_acc_idx = len(glb.accessors)
    glb.accessors.append(pygltflib.Accessor(
        bufferView=joints_bv_idx,
        byteOffset=0,
        componentType=pygltflib.UNSIGNED_SHORT,
        count=vertex_count,
        type=pygltflib.VEC4,
        max=[int(joints_0[:, k].max()) for k in range(4)],
        min=[int(joints_0[:, k].min()) for k in range(4)]
    ))

    # B. Append WEIGHTS_0 (float32 vec4)
    weights_bytes = weights_0.tobytes()
    weights_offset, weights_len = append_data(weights_bytes)
    weights_bv_idx = len(glb.bufferViews)
    glb.bufferViews.append(pygltflib.BufferView(
        buffer=0,
        byteOffset=weights_offset,
        byteLength=weights_len,
        target=pygltflib.ARRAY_BUFFER
    ))
    weights_acc_idx = len(glb.accessors)
    glb.accessors.append(pygltflib.Accessor(
        bufferView=weights_bv_idx,
        byteOffset=0,
        componentType=pygltflib.FLOAT,
        count=vertex_count,
        type=pygltflib.VEC4,
        max=[float(weights_0[:, k].max()) for k in range(4)],
        min=[float(weights_0[:, k].min()) for k in range(4)]
    ))

    # C. Append Inverse Bind Matrices (float32 mat4)
    ibm_bytes = inv_bind_matrices.tobytes()
    ibm_offset, ibm_len = append_data(ibm_bytes)
    ibm_bv_idx = len(glb.bufferViews)
    glb.bufferViews.append(pygltflib.BufferView(
        buffer=0,
        byteOffset=ibm_offset,
        byteLength=ibm_len
    ))
    ibm_acc_idx = len(glb.accessors)
    glb.accessors.append(pygltflib.Accessor(
        bufferView=ibm_bv_idx,
        byteOffset=0,
        componentType=pygltflib.FLOAT,
        count=6,
        type=pygltflib.MAT4
    ))

    # Assign attributes to mesh
    prim.attributes.JOINTS_0 = joints_acc_idx
    prim.attributes.WEIGHTS_0 = weights_acc_idx

    # 6. Build Bone Nodes
    # Existing nodes: 0, 1, 2 (mesh_node is usually 2)
    start_node_idx = len(glb.nodes)
    
    # Bone nodes indices:
    # 0: Root        -> start_node_idx + 0
    # 1: Spine       -> start_node_idx + 1
    # 2: Chest       -> start_node_idx + 2
    # 3: Head        -> start_node_idx + 3
    # 4: Arm_L       -> start_node_idx + 4
    # 5: Arm_R       -> start_node_idx + 5
    # Armature Root  -> start_node_idx + 6

    b_root = start_node_idx + 0
    b_spine = start_node_idx + 1
    b_chest = start_node_idx + 2
    b_head = start_node_idx + 3
    b_arml = start_node_idx + 4
    b_armr = start_node_idx + 5
    armature_node = start_node_idx + 6

    # Node 0: Root
    glb.nodes.append(pygltflib.Node(
        name="Bone_Root",
        translation=[0.0, -0.85, 0.0],
        children=[b_spine]
    ))
    # Node 1: Spine
    glb.nodes.append(pygltflib.Node(
        name="Bone_Spine",
        translation=[0.0, 0.50, 0.0],
        children=[b_chest]
    ))
    # Node 2: Chest
    glb.nodes.append(pygltflib.Node(
        name="Bone_Chest",
        translation=[0.0, 0.50, 0.0],
        children=[b_head, b_arml, b_armr]
    ))
    # Node 3: Head
    glb.nodes.append(pygltflib.Node(
        name="Bone_Head",
        translation=[0.0, 0.50, 0.0]
    ))
    # Node 4: Arm_L
    glb.nodes.append(pygltflib.Node(
        name="Bone_Arm_L",
        translation=[-0.55, 0.0, 0.0]
    ))
    # Node 5: Arm_R
    glb.nodes.append(pygltflib.Node(
        name="Bone_Arm_R",
        translation=[0.55, 0.0, 0.0]
    ))
    # Node 6: Armature Container
    glb.nodes.append(pygltflib.Node(
        name="Armature",
        children=[b_root]
    ))

    # Add Armature to default scene
    default_scene_idx = glb.scene if glb.scene is not None else 0
    if glb.scenes and len(glb.scenes) > default_scene_idx:
        glb.scenes[default_scene_idx].nodes.append(armature_node)

    # 7. Create Skin Definition
    joint_node_indices = [b_root, b_spine, b_chest, b_head, b_arml, b_armr]
    skin_idx = len(glb.skins)
    glb.skins.append(pygltflib.Skin(
        name="Bot_Skeleton",
        inverseBindMatrices=ibm_acc_idx,
        joints=joint_node_indices,
        skeleton=b_root
    ))

    # Attach skin to mesh node
    # Find mesh node
    mesh_node = None
    for n in glb.nodes:
        if n.mesh == 0:
            mesh_node = n
            break
    if mesh_node:
        mesh_node.skin = skin_idx
        print(f"Assigned skin {skin_idx} to mesh node {mesh_node.name}")

    # 8. Create Embedded Skeletal Animation Clips!
    # Helper to append times and values
    def add_anim_channel_data(times, values, is_quat=True):
        t_arr = np.array(times, dtype=np.float32)
        v_arr = np.array(values, dtype=np.float32)

        t_offset, t_len = append_data(t_arr.tobytes())
        t_bv = len(glb.bufferViews)
        glb.bufferViews.append(pygltflib.BufferView(buffer=0, byteOffset=t_offset, byteLength=t_len))
        t_acc = len(glb.accessors)
        glb.accessors.append(pygltflib.Accessor(
            bufferView=t_bv, byteOffset=0, componentType=pygltflib.FLOAT,
            count=len(times), type=pygltflib.SCALAR,
            min=[float(t_arr.min())], max=[float(t_arr.max())]
        ))

        v_offset, v_len = append_data(v_arr.tobytes())
        v_bv = len(glb.bufferViews)
        glb.bufferViews.append(pygltflib.BufferView(buffer=0, byteOffset=v_offset, byteLength=v_len))
        v_acc = len(glb.accessors)
        glb.accessors.append(pygltflib.Accessor(
            bufferView=v_bv, byteOffset=0, componentType=pygltflib.FLOAT,
            count=len(times), type=pygltflib.VEC4 if is_quat else pygltflib.VEC3
        ))
        return t_acc, v_acc

    # CLIP 1: "IdleBreathe" (Gentle spine breathing, head tilt, arm float)
    anim_idle = pygltflib.Animation(name="IdleBreathe")
    times_idle = [0.0, 0.5, 1.0, 1.5, 2.0]
    
    # Chest breath (pitch)
    chest_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.05, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(-0.03, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_idle, chest_quats, is_quat=True)
    samp_idx = len(anim_idle.samplers)
    anim_idle.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_idle.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_chest, path="rotation")))

    # Head gentle tilt
    head_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(-0.04, 0.04, 0.02),
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.03, -0.03, -0.02),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_idle, head_quats, is_quat=True)
    samp_idx = len(anim_idle.samplers)
    anim_idle.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_idle.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_head, path="rotation")))

    glb.animations.append(anim_idle)

    # CLIP 2: "WaveDance" (Arm wave + spine sway)
    anim_wave = pygltflib.Animation(name="WaveDance")
    times_wave = [0.0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.0]
    
    # Arm_R waving up and down
    arm_r_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.6, 0.2),
        euler_to_quaternion(0.0, 0.3, 0.1),
        euler_to_quaternion(0.0, 0.7, 0.3),
        euler_to_quaternion(0.0, 0.3, 0.1),
        euler_to_quaternion(0.0, 0.6, 0.2),
        euler_to_quaternion(0.0, 0.2, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_wave, arm_r_quats, is_quat=True)
    samp_idx = len(anim_wave.samplers)
    anim_wave.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_wave.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_armr, path="rotation")))

    # Spine rhythm sway
    spine_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, -0.08, 0.05),
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.08, -0.05),
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, -0.08, 0.05),
        euler_to_quaternion(0.0, 0.04, -0.02),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_wave, spine_quats, is_quat=True)
    samp_idx = len(anim_wave.samplers)
    anim_wave.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_wave.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_spine, path="rotation")))

    glb.animations.append(anim_wave)

    # CLIP 3: "HeadNod" (Cheerful nodding & talking)
    anim_nod = pygltflib.Animation(name="HeadNod")
    times_nod = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5]
    head_nod_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.25, 0.0, 0.0),
        euler_to_quaternion(-0.08, 0.0, 0.0),
        euler_to_quaternion(0.25, 0.0, 0.0),
        euler_to_quaternion(-0.05, 0.0, 0.0),
        euler_to_quaternion(0.15, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_nod, head_nod_quats, is_quat=True)
    samp_idx = len(anim_nod.samplers)
    anim_nod.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_nod.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_head, path="rotation")))

    glb.animations.append(anim_nod)

    # CLIP 4: "DualArmWave" (Both arms waving high in the air)
    anim_dual_wave = pygltflib.Animation(name="DualArmWave")
    times_dual = [0.0, 0.35, 0.70, 1.05, 1.40, 1.75, 2.10]
    
    # Left Arm: swings up to +1.0 rad Z, waving between +0.6 and +1.1 rad
    arml_dual_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.95, 0.2),
        euler_to_quaternion(0.0, 0.60, 0.1),
        euler_to_quaternion(0.0, 1.10, 0.25),
        euler_to_quaternion(0.0, 0.65, 0.1),
        euler_to_quaternion(0.0, 0.95, 0.2),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_dual, arml_dual_quats, is_quat=True)
    samp_idx = len(anim_dual_wave.samplers)
    anim_dual_wave.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_dual_wave.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_arml, path="rotation")))

    # Right Arm: swings up to -1.0 rad Z, waving between -0.6 and -1.1 rad
    armr_dual_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, -0.95, -0.2),
        euler_to_quaternion(0.0, -0.60, -0.1),
        euler_to_quaternion(0.0, -1.10, -0.25),
        euler_to_quaternion(0.0, -0.65, -0.1),
        euler_to_quaternion(0.0, -0.95, -0.2),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_dual, armr_dual_quats, is_quat=True)
    samp_idx = len(anim_dual_wave.samplers)
    anim_dual_wave.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_dual_wave.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_armr, path="rotation")))

    # Chest & Spine excited bounce during wave
    chest_wave_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.08, 0.0, 0.0),
        euler_to_quaternion(-0.04, 0.0, 0.0),
        euler_to_quaternion(0.08, 0.0, 0.0),
        euler_to_quaternion(-0.04, 0.0, 0.0),
        euler_to_quaternion(0.06, 0.0, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_dual, chest_wave_quats, is_quat=True)
    samp_idx = len(anim_dual_wave.samplers)
    anim_dual_wave.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_dual_wave.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_chest, path="rotation")))

    glb.animations.append(anim_dual_wave)

    # CLIP 5: "RobotArms" (Alternating robotic front/back arm pump)
    anim_robot = pygltflib.Animation(name="RobotArms")
    times_robot = [0.0, 0.35, 0.70, 1.05, 1.40]
    
    # Left Arm: pitches forward (+0.8 rad X) then backward (-0.8 rad X)
    arml_robot_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.85, 0.0, 0.15),
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(-0.85, 0.0, 0.15),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_robot, arml_robot_quats, is_quat=True)
    samp_idx = len(anim_robot.samplers)
    anim_robot.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_robot.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_arml, path="rotation")))

    # Right Arm: pitches backward (-0.8 rad X) then forward (+0.8 rad X)
    armr_robot_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(-0.85, 0.0, -0.15),
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.85, 0.0, -0.15),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_robot, armr_robot_quats, is_quat=True)
    samp_idx = len(anim_robot.samplers)
    anim_robot.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_robot.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_armr, path="rotation")))

    glb.animations.append(anim_robot)

    # CLIP 6: "ArmFlap" (Rapid wing flapping / jumping jacks)
    anim_flap = pygltflib.Animation(name="ArmFlap")
    times_flap = [0.0, 0.20, 0.40, 0.60, 0.80, 1.00, 1.20]
    
    arml_flap_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, 1.25, 0.0),
        euler_to_quaternion(0.0, 0.10, 0.0),
        euler_to_quaternion(0.0, 1.25, 0.0),
        euler_to_quaternion(0.0, 0.10, 0.0),
        euler_to_quaternion(0.0, 1.25, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_flap, arml_flap_quats, is_quat=True)
    samp_idx = len(anim_flap.samplers)
    anim_flap.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_flap.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_arml, path="rotation")))

    armr_flap_quats = [
        euler_to_quaternion(0.0, 0.0, 0.0),
        euler_to_quaternion(0.0, -1.25, 0.0),
        euler_to_quaternion(0.0, -0.10, 0.0),
        euler_to_quaternion(0.0, -1.25, 0.0),
        euler_to_quaternion(0.0, -0.10, 0.0),
        euler_to_quaternion(0.0, -1.25, 0.0),
        euler_to_quaternion(0.0, 0.0, 0.0)
    ]
    t_acc, v_acc = add_anim_channel_data(times_flap, armr_flap_quats, is_quat=True)
    samp_idx = len(anim_flap.samplers)
    anim_flap.samplers.append(pygltflib.AnimationSampler(input=t_acc, output=v_acc, interpolation="LINEAR"))
    anim_flap.channels.append(pygltflib.AnimationChannel(sampler=samp_idx, target=pygltflib.AnimationChannelTarget(node=b_armr, path="rotation")))

    glb.animations.append(anim_flap)

    # Update the single binary blob length in buffer 0
    glb.set_binary_blob(bytes(blob))
    glb.buffers[0].byteLength = len(blob)

    print(f"Saving fully rigged GLB to {output_path}...")
    glb.save(output_path)
    print("SUCCESS: Rigged GLB exported successfully!")

if __name__ == '__main__':
    main()
