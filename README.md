# Voice Thinking Partner

A mobile-first voice web app that helps users think through decisions by asking targeted questions.

## Project Setup Complete

This repository contains the initial setup for the Voice Thinking Partner project, built for the lablab.ai x AssemblyAI voice AI hackathon.

### What's been set up:
- React + Vite project structure
- Basic App component with starter UI
- Dependencies installed (React, ReactDOM, Vite)
- Development server configured

### Next Steps (per the spec):
1. Implement core voice loop with AssemblyAI Voice Agent API (Week 1)
2. Add session state and tool calls for reasoning-gap detection (Week 2)
3. Build UI and visual polish including feedback chips (Week 3)
4. Demo recording and buffer time (Week 4)

### Available Scripts:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Mobile Testing Preparation
The app is designed for mobile use. Here's how to test on iOS/Android devices:

**Important: Microphone Access Requires Secure Context**
- For microphone access to work, the page must be served via HTTPS or localhost
- LAN IP addresses (e.g., http://192.168.x.x:port) will NOT work for microphone access due to browser security restrictions

**Recommended Testing Approaches:**

1. **Localhost Testing (Simplest):**
   - On your development machine: `npm run dev -- --host`
   - On mobile device, connect to same WiFi and visit: `http://[YOUR_MACHINE_IP]:5173`
   - ⚠️ Note: This only works if your development machine is accessible via its hostname or IP AND you're accessing it from the same machine (not recommended for mic testing)

2. **HTTPS Tunnel Testing (Recommended for Mic Access):**
   - Use a tool like [ngrok](https://ngrok.com/) or [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/) to create a secure tunnel
   - Start the dev server: `npm run dev -- --host`
   - Create HTTPS tunnel to port 5173: `ngrok http 5173` 
   - Visit the HTTPS URL provided by ngrok on your mobile device
   - This provides a valid HTTPS context for microphone access

3. **Production Build Testing:**
   - Build the app: `npm run build`
   - Serve the build via an HTTPS server (e.g., using `npm install -g serve` then `serve -s dist`)
   - Create an HTTPS tunnel to the serving port if testing on LAN

**Device-Specific Notes:**
- **iOS Safari:** Requires HTTPS for microphone access in production; localhost works for development
- **Android Chrome:** Requires HTTPS or localhost; may need to disable battery optimization for Chrome during testing
- **Both platforms:** WebSocket connection may be less stable on cellular networks; fallback to mock mode is verified to work

**Manual Test Steps:**
1. Allow microphone access when prompted
2. Speak naturally - observe feedback chips appearing for claims, assumptions, etc.
3. End session and verify artifact screen displays correctly
4. Test share functionality (Web Share API on native, clipboard fallback on desktop)
5. Test connection error handling by temporarily disconnecting network
6. Verify background behavior (if applicable per platform guidelines)

### Project Structure:
```
src/
├── App.jsx          # Main application component
├── App.css          # Styling
├── main.jsx         # React entry point
index.html           # HTML template
package.json         # Project dependencies
vite.config.js       # Vite configuration
```

---
*Built with React and Vite for the AssemblyAI Voice Agent API hackathon track.*