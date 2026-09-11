import asyncio
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    for v in voices:
        if v['Locale'].startswith('en-'):
            print(f"{v['ShortName']:35} | {v['Gender']:6} | {v.get('VoiceTag', {}).get('VoicePersonalities', [])}")

if __name__ == '__main__':
    asyncio.run(main())
