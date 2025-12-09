# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Database Configuration

The application (backend) requires a MongoDB connection. Configure it in the `.env` file located in the **project root** (one level up from this `client` folder).

### 1. Create/Edit `.env`

Create a file named `.env` in the root directory `c:\Projects\todo3\.env` (if it doesn't exist) and add the following:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-address>/dailytodo?retryWrites=true&w=majority&appName=Cluster0
```

*Replace `<username>`, `<password>`, and `<cluster-address>` with your actual MongoDB Atlas details.*
*Alternatively, for local MongoDB, use:* `MONGODB_URI=mongodb://localhost:27017/dailytodo`
*Ensure there are **no spaces** or special characters unescaped if copying from other sources.*

### 2. Restart Server

After updating `.env`, you must restart the backend server:

```bash
# In the root directory
npm run dev
```

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
