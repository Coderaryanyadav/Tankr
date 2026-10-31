# TANKR — Maps & Geospatial Services Setup

## 1. Mapping Architecture

TANKR implements a dual-layer mapping stack:
1. **Web Browser (`Platform.OS === 'web'`)**:
   Uses an interactive geospatial canvas rendering Carto Dark/Voyager vector basemaps or OpenStreetMap raster tiles with full anti-collision marker clustering.
2. **Native iOS & Android**:
   Powered by `react-native-maps` integrated with Mappls (MapmyIndia) via the custom config plugin [`plugins/withMappls.js`](../../plugins/withMappls.js).

---

## 2. API Credentials Configuration

### A. Mappls (MapmyIndia)
1. Sign up at [auth.mappls.com](https://auth.mappls.com/console/#/home/dashboard/applications).
2. Generate an API Key with access to:
   - Geocoding & Reverse Geocoding APIs.
   - Distance Matrix & Routing Engine.
3. Add credentials to `.env`:
   ```env
   EXPO_PUBLIC_MAPPLS_REST_KEY=your_rest_key_here
   EXPO_PUBLIC_MAPPLS_CLIENT_ID=your_client_id_here
   EXPO_PUBLIC_MAPPLS_CLIENT_SECRET=your_client_secret_here
   ```

### B. Carto Basemaps (Web Dashboard)
1. Obtain an API key from [carto.com](https://carto.com/basemaps/).
2. Add to `.env`:
   ```env
   EXPO_PUBLIC_CARTO_API_KEY=your_carto_key_here
   ```

---

## 3. Graceful Fallbacks

If no external mapping keys are configured:
- Web maps automatically fall back to public OpenStreetMap and Carto Positron tiles.
- Reverse geocoding falls back to municipal bounding box coordinates for Mumbai Metro.
