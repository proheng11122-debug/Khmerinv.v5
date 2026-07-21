// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "KH Invoice",
        short_name: "KH Invoice",
        description: "\u179C\u17B7\u1780\u17D2\u1780\u1799\u1794\u178F\u17D2\u179A \u1793\u17B7\u1784 \u1782\u17D2\u179A\u1794\u17CB\u1782\u17D2\u179A\u1784\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u17A2\u17B6\u1787\u17B8\u179C\u1780\u1798\u17D2\u1798\u1782\u17D2\u179A\u1794\u17CB\u1794\u17D2\u179A\u1797\u17C1\u1791",
        theme_color: "#0C447C",
        background_color: "#F7FAFD",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        // Don't let the service worker cache Supabase API/auth calls —
        // this app is data-driven and always needs fresh data.
        navigateFallbackDenylist: [/^\/supabase/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith("supabase.co"),
            handler: "NetworkOnly"
          }
        ]
      }
    })
  ],
  optimizeDeps: { exclude: ["lucide-react"] }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluamVjdFJlZ2lzdGVyOiAnYXV0bycsXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24ucG5nJywgJ2FwcGxlLXRvdWNoLWljb24ucG5nJ10sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiAnS0ggSW52b2ljZScsXG4gICAgICAgIHNob3J0X25hbWU6ICdLSCBJbnZvaWNlJyxcbiAgICAgICAgZGVzY3JpcHRpb246ICdcdTE3OUNcdTE3QjdcdTE3ODBcdTE3RDJcdTE3ODBcdTE3OTlcdTE3OTRcdTE3OEZcdTE3RDJcdTE3OUEgXHUxNzkzXHUxN0I3XHUxNzg0IFx1MTc4Mlx1MTdEMlx1MTc5QVx1MTc5NFx1MTdDQlx1MTc4Mlx1MTdEMlx1MTc5QVx1MTc4NFx1MTc5MVx1MTdCN1x1MTc5M1x1MTdEMlx1MTc5M1x1MTc5M1x1MTdEMFx1MTc5OVx1MTdBMlx1MTdCNlx1MTc4N1x1MTdCOFx1MTc5Q1x1MTc4MFx1MTc5OFx1MTdEMlx1MTc5OFx1MTc4Mlx1MTdEMlx1MTc5QVx1MTc5NFx1MTdDQlx1MTc5NFx1MTdEMlx1MTc5QVx1MTc5N1x1MTdDMVx1MTc5MScsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzBDNDQ3QycsXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjRjdGQUZEJyxcbiAgICAgICAgZGlzcGxheTogJ3N0YW5kYWxvbmUnLFxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIHNjb3BlOiAnLycsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi0xOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICB7IHNyYzogJy9pY29uLTUxMi5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJyB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNyYzogJy9pY29uLW1hc2thYmxlLTUxMi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgcHVycG9zZTogJ21hc2thYmxlJyxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgLy8gRG9uJ3QgbGV0IHRoZSBzZXJ2aWNlIHdvcmtlciBjYWNoZSBTdXBhYmFzZSBBUEkvYXV0aCBjYWxscyBcdTIwMTRcbiAgICAgICAgLy8gdGhpcyBhcHAgaXMgZGF0YS1kcml2ZW4gYW5kIGFsd2F5cyBuZWVkcyBmcmVzaCBkYXRhLlxuICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL3N1cGFiYXNlL10sXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogKHsgdXJsIH0pID0+IHVybC5ob3N0bmFtZS5lbmRzV2l0aCgnc3VwYWJhc2UuY28nKSxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrT25seScsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIG9wdGltaXplRGVwczogeyBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCddIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxnQkFBZ0I7QUFBQSxNQUNoQixlQUFlLENBQUMsZUFBZSxzQkFBc0I7QUFBQSxNQUNyRCxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxhQUFhO0FBQUEsUUFDYixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsUUFDUCxPQUFPO0FBQUEsVUFDTCxFQUFFLEtBQUssaUJBQWlCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUM1RCxFQUFFLEtBQUssaUJBQWlCLE9BQU8sV0FBVyxNQUFNLFlBQVk7QUFBQSxVQUM1RDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFlBQ04sU0FBUztBQUFBLFVBQ1g7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBO0FBQUE7QUFBQSxRQUdQLDBCQUEwQixDQUFDLGFBQWE7QUFBQSxRQUN4QyxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZLENBQUMsRUFBRSxJQUFJLE1BQU0sSUFBSSxTQUFTLFNBQVMsYUFBYTtBQUFBLFlBQzVELFNBQVM7QUFBQSxVQUNYO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxjQUFjLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRTtBQUM1QyxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
