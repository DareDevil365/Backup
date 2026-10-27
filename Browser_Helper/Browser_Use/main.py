import asyncio
from dotenv import load_dotenv
from browser_use import Agent, ChatGoogle

# Load environment variables from .env
load_dotenv()

async def main():
    agent = Agent(
        task="Go to https://news.ycombinator.com and find the title of the #1 post.",
        llm=ChatGoogle(model="gemini-2.5-flash"),
    )
    result = await agent.run()
    print("\n--- Result ---")
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
