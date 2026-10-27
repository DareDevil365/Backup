from google import genai
import os
import sys

if sys.version_info >= (3, 7):
    sys.stdout.reconfigure(encoding='utf-8')

api_key = os.environ.get("GEMINI_API_KEYS", "AIzaSyDlU0jWxjl7-IohXLMhmT5jBb2ZRPLc-bg")
client = genai.Client(api_key=api_key)

print("Listing models:")
try:
    for model in client.models.list():
        print(f"Model: {model.name}, Supported Methods: {model.supported_actions}")
except Exception as e:
    print(f"Error: {e}")
