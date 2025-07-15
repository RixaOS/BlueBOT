// import puppeteer from "puppeteer";
// import fs from "fs";
// import path from "path";

// (async () => {
//   console.log("🚀 Starting Puppeteer with Firefox...");

//   const firefoxPath = "C:\\Program Files\\Mozilla Firefox\\firefox.exe"; // Ensure this is correct for your system

//   if (!fs.existsSync(firefoxPath)) {
//     console.error("❌ Firefox is not installed at the specified path.");
//     return;
//   } else {
//     console.log("✅ Firefox is detected at:", firefoxPath);
//   }

//   // Create a clean, isolated Firefox profile directory
//   const profileDir = path.join("./", "firefox-profile-debug");
//   if (fs.existsSync(profileDir)) {
//     fs.rmdirSync(profileDir, { recursive: true });
//     console.log("✅ Removed old profile directory (clean).");
//   }
//   fs.mkdirSync(profileDir);
//   console.log("✅ Created clean Firefox profile directory:", profileDir);

//   const cookiesPath = path.join("./", "spotify-cookies.json");

//   console.log("🚀 Launching Firefox...");
//   const browser = await puppeteer.launch({
//     headless: false,
//     executablePath: firefoxPath,
//     userDataDir: profileDir,
//     ignoreDefaultArgs: true,
//     args: [
//       "-new-instance",
//       "https://accounts.spotify.com/nl/login?continue=https%3A%2F%2Fopen.spotify.com%2F"
//     ],
//   });

//   console.log("✅ Browser launched successfully.");

//   const pages = await browser.pages();
//   if (pages.length === 0) {
//     console.error("❌ No pages loaded. Something went wrong.");
//     await browser.close();
//     return;
//   }

//   const page = pages[0];
//   console.log("✅ Firefox with Puppeteer is running on Spotify Login.");

//   // Debugging: Monitor page errors
//   page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
//   page.on("error", (err) => console.error("PAGE ERROR:", err));
//   page.on("pageerror", (err) => console.error("PAGE ERROR EVENT:", err));

//   // Load cookies if available
//   if (fs.existsSync(cookiesPath)) {
//     const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));
//     await page.setCookie(...cookies);
//     console.log("✅ Loaded saved cookies.");
//     await page.reload({ waitUntil: "networkidle2" });
//   } else {
//     console.log("⚠️ No saved cookies found. Please log in manually.");
//   }

//   console.log("⏳ Waiting for Spotify login or error...");

//   try {
//     // Wait for login page to load
//     await page.waitForSelector('input[id="login-username"]', {
//       timeout: 120000, // 2 minutes
//     });

//     console.log("✅ Login page or logged-in profile detected.");

//     // Save cookies after login
//     const cookies = await page.cookies();
//     fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
//     console.log("✅ Cookies saved to spotify-cookies.json.");

//     // Prevent the script from crashing (keep it running)
//     console.log("✅ The browser will stay open.");
//     await new Promise(() => {}); // Prevent script from exiting

//   } catch (error) {
//     console.error("❌ Error during login or page interaction:", error);
//   }
// })();
