<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ccca6e0f-d0f9-4f7f-af4f-e7a4c74c0be0

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`



❯ 关于线路，我希望初始化很多数据，我希望和国家铁路的  
  真实联通一致，你按照真实铁路网创建线路，把省会与省  
  会（包括直辖市）的连接分类为主干线路，其他的是普通  
  线路，用粗线和细线在地图上区分，只修改data\routes.  
  json应该就能实现 