from google import genai
client = genai.Client(api_key="AIzaSyDlU0jWxjl7-IohXLMhmT5jBb2ZRPLc-bg")
for m in client.models.list():
    name = m.name
    if "gemini" in name.lower():
        print(name)
