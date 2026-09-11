import asyncio
import edge_tts
import os

OUTPUT_DIR = os.path.abspath("vedika/Vyomanta/frontend/public/audio/home")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Excited, kiddish character lines with Mowgli, Belle, Moana, Bhageera
CLIPS = [
    {
        "filename": "purple_home.mp3",
        # Mowgli: Energetic, enthusiastic, excited young boy
        "text": "Yaaay! My name is Mowgli! Let's wait for my friends!",
        "voice": "en-US-AndrewMultilingualNeural",
        "rate": "+6%",
        "pitch": "+22Hz"
    },
    {
        "filename": "red_home.mp3",
        # Belle: Sweet, cheerful, bubbly excited cartoon girl (Ana is the child cartoon voice)
        "text": "Hello everyone! My name is Belle!",
        "voice": "en-US-AnaNeural",
        "rate": "+2%",
        "pitch": "+6Hz"
    },
    {
        "filename": "olive_home.mp3",
        # Moana: Adventurous, joyful, high-energy young girl
        "text": "And my name is Moana! Woohoo, another friend is coming, wait!",
        "voice": "en-GB-MaisieNeural",
        "rate": "+4%",
        "pitch": "+16Hz"
    },
    {
        "filename": "blue_journey.mp3",
        # Bhageera: Out of breath from interdimensional portal warp
        "text": "Whoaaaooow... phew... That was... such a long journey!",
        "voice": "en-US-BrianMultilingualNeural",
        "rate": "-18%",
        "pitch": "-4Hz"
    },
    {
        "filename": "blue_howareyou.mp3",
        # Bhageera: Perks up cheerfully with kiddish curiosity
        "text": "...By the way, how are you doing?!",
        "voice": "en-US-BrianMultilingualNeural",
        "rate": "+4%",
        "pitch": "+14Hz"
    }
]

async def generate_all():
    print("Generating perfectly paced Home Avatar Audio Clips...")
    for clip in CLIPS:
        dest = os.path.join(OUTPUT_DIR, clip["filename"])
        communicate = edge_tts.Communicate(
            text=clip["text"],
            voice=clip["voice"],
            rate=clip["rate"],
            pitch=clip["pitch"]
        )
        await communicate.save(dest)
        size = os.path.getsize(dest)
        print(f" Saved: {clip['filename']} ({size} bytes) [{clip['voice']}]")
        print(f"   Text: \"{clip['text']}\"")

if __name__ == "__main__":
    asyncio.run(generate_all())
