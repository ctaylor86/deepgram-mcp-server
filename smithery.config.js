export default {
  esbuild: {
    // Mark packages as external to avoid bundling issues
    external: ["chalk", "cors", "express"],
    
    // Enable minification for production
    minify: true,
    
    // Set Node.js target version
    target: "node20",
  },
};
