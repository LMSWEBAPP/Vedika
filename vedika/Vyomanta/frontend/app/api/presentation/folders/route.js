import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getSystemPresentationsDir() {
  try {
    const userDocs = path.join(os.homedir(), 'Documents', 'VedikaPresentations');
    if (fs.existsSync(userDocs)) {
      return userDocs;
    }
  } catch (e) {}

  const localUploads = path.join(process.cwd(), 'public', 'uploads', 'presentations');
  if (!fs.existsSync(localUploads)) {
    fs.mkdirSync(localUploads, { recursive: true });
  }
  return localUploads;
}

export async function GET(request) {
  try {
    const baseDir = getSystemPresentationsDir();
    const { searchParams } = new URL(request.url);
    const folderName = searchParams.get('folder');

    if (folderName) {
      const targetPath = path.join(baseDir, folderName);
      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }

      const files = fs.readdirSync(targetPath).map(file => {
        const filePath = path.join(targetPath, file);
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return null;

        const ext = path.extname(file).toLowerCase();
        const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext);
        const isDoc = ['.pdf', '.txt', '.md', '.doc', '.docx', '.ppt', '.pptx'].includes(ext);

        let dataUrl = `/uploads/presentations/${folderName}/${file}`;
        if (isImage && baseDir.includes('Documents')) {
          try {
            const buf = fs.readFileSync(filePath);
            const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.webp' ? 'image/webp' : 'image/png';
            dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
          } catch (e) {}
        }

        return {
          name: file,
          url: dataUrl,
          ext,
          type: isImage ? 'image' : isDoc ? 'document' : 'file',
          sizeBytes: stat.size
        };
      }).filter(Boolean);

      return NextResponse.json({ folder: folderName, files });
    }

    // List all presentation folders from system directory
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => {
        const folderPath = path.join(baseDir, entry.name);
        const filesCount = fs.readdirSync(folderPath).length;
        return {
          name: entry.name,
          filesCount,
          createdAt: fs.statSync(folderPath).birthtime
        };
      });

    return NextResponse.json({ folders, rootDir: baseDir });
  } catch (error) {
    console.error('Error in Presentation Folders GET API:', error);
    return NextResponse.json({ error: 'Failed to list presentation folders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const baseDir = getSystemPresentationsDir();
    const formData = await request.formData();
    const action = formData.get('action');
    const folderName = formData.get('folderName')?.trim();

    if (!folderName) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    }

    const sanitizedFolder = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderPath = path.join(baseDir, sanitizedFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    if (action === 'upload_files') {
      const files = formData.getAll('files');
      const savedFiles = [];

      for (const file of files) {
        if (typeof file === 'object' && file.name) {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const filePath = path.join(folderPath, sanitizedFilename);

          fs.writeFileSync(filePath, buffer);
          savedFiles.push({
            name: sanitizedFilename,
            path: filePath
          });
        }
      }

      return NextResponse.json({
        message: `Uploaded ${savedFiles.length} assets directly to local system folder ${sanitizedFolder}`,
        folder: sanitizedFolder,
        savedFiles
      });
    }

    return NextResponse.json({
      message: `System presentation folder '${sanitizedFolder}' created successfully`,
      folder: sanitizedFolder,
      path: folderPath
    });
  } catch (error) {
    console.error('Error in Presentation Folders POST API:', error);
    return NextResponse.json({ error: 'Failed to process presentation folder request' }, { status: 500 });
  }
}
