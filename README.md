## TokenSmith Frontend

TokenSmith is a React/Vite application that lets learners explore course material through an AI chat assistant with citation-backed answers and an inline PDF viewer. The frontend talks to a FastAPI backend that handles question answering and retrieval-augmented responses.

### Key Features
- **Conversational assistant** with sample prompts, streaming UI feedback, and automatic scrolling.
- **Citation chips** that deep-link into the accompanying textbook PDF so learners can verify answers quickly.
- **Configurable prompts** via the settings drawer; tweak chunking, temperature, and retrieval parameters in real time.
- **Responsive layout** that adapts between full-width chat and split-screen chat + PDF viewer.

### Tech Stack
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix primitives), React Router.
- State & utilities: React Hooks, React Hook Form, Zod, clsx/cva.
- Backend: FastAPI served by `uvicorn` at `http://localhost:8000`. 

---

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later (bundled with Node)

If you manage multiple Node or Python versions, consider installing [nvm](https://github.com/nvm-sh/nvm) (macOS/Linux), [nvs](https://github.com/jasongin/nvs) (Windows), and `pyenv` or `uv`.

---

## Setup on macOS (Apple Silicon & Intel)

1. **Install Node.js**
   ```bash
   brew install node@20
   ```
   > Alternatively, use `nvm install --lts` if you already have Homebrew.

2. **Clone the repository**
   ```bash
   git clone git@github.com:georgia-tech-db/TokenSmith-Frontend.git
   cd TokenSmith-Frontend
   ```

3. **Install frontend dependencies**
   ```bash
   npm install
   ```

4. **Start the backend API**
   ```bash
   uvicorn src.api_server:app --reload
   ```

5. **Start the frontend dev server (in a separate terminal)**
   ```bash
   npm run dev
   ```

6. Open the app at `http://localhost:5173`. The frontend expects the backend at `http://localhost:8000`. Update `src/services/api.ts` if your API base URL differs.

---

## Setup on Windows 11

1. **Install Node.js**
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
   > Alternatively download the MSI installer from [nodejs.org](https://nodejs.org/).

2. **Clone the repository (PowerShell)**
   ```powershell
   git clone git@github.com:georgia-tech-db/TokenSmith-Frontend.git
   cd TokenSmith-Frontend
   ```

3. **Install frontend dependencies**
   ```powershell
   npm install
   ```

4. **Start the backend API**
   ```powershell
   uvicorn src.api_server:app --reload
   ```

5. **Start the frontend dev server in another PowerShell window**
   ```powershell
   npm run dev
   ```

6. Visit `http://localhost:5173` in your browser.

---

## Project Structure

```
TokenSmith-Frontend/
├── public/            # Static assets (including textbook PDF)
├── src/
│   ├── components/    # UI components (chat, PDF viewer, settings)
│   ├── hooks/         # Custom hooks (e.g., settings state)
│   ├── services/      # API clients for backend communication
│   ├── types/         # Shared TypeScript interfaces
│   └── main.tsx       # Application bootstrap
├── package.json       # Frontend scripts and dependencies
└── README.md
```

---

## Available npm Scripts
- `npm run dev` – Start the Vite development server.
- `npm run build` – Type-check and generate a production build in `dist/`.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Run ESLint against the codebase.
- `npm run typecheck` – Run TypeScript without emitting files.

---

## Environment Configuration

`src/services/api.ts` currently points to `http://localhost:8000/api`. If your backend runs elsewhere, set an environment variable and reference it in code:

```bash
# example .env
VITE_API_BASE_URL=https://api.example.com
```

Then update `sendChatMessage` to use `import.meta.env.VITE_API_BASE_URL`.

---

## Running in Production

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Serve the `dist/` directory with your preferred static host (Netlify, Vercel, S3 + CloudFront, Nginx, etc.).
3. Deploy the FastAPI backend separately (e.g., on Azure App Service, AWS ECS, Railway). Ensure CORS is configured to allow your frontend origin.

---

## Troubleshooting
- **CORS errors**: Confirm FastAPI has CORS middleware allowing `http://localhost:5173`.
- **PDF not loading**: Ensure `public/textbook.pdf` exists or adjust the path passed to `PdfViewer`.
- **API 404/500**: Verify the backend server is running and that endpoints match `src/services/api.ts`.
- **Port conflicts**: Change frontend port with `npm run dev -- --port 5174` or set `UVICORN_PORT`.

---

## Contributing
1. Fork and clone the repo.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit with conventional messages.
4. Run `npm run lint` and `npm run typecheck` before pushing.
5. Open a PR; include screenshots or loom links for UI updates.

---

## License

Specify your license here (e.g., MIT). Remove or update this section once a license is chosen.


