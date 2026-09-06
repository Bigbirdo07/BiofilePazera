/// <reference types="vite/client" />

declare module '*.pdb?raw' {
  const content: string;
  export default content;
}
