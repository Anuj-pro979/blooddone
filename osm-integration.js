// OpenStreetMap Integration using Leaflet.js

// Global variables
let maps = {};
let markers = {};
let routes = {};

// OpenStreetMap Integration object
window.OSMIntegration = {
    // Initialize a map with default center (India)
    initMap: function(elementId, options = {}) {
        // Default options
        const defaultOptions = {
            center: [20.5937, 78.9629], // Center of India
            zoom: 5,
            minZoom: 3,
            maxZoom: 18
        };
        
        // Merge default options with provided options
        const mapOptions = {...defaultOptions, ...options};
        
        // Create map if element exists
        const mapElement = document.getElementById(elementId);
        if (!mapElement) {
            console.error(`Map element with ID '${elementId}' not found`);
            return null;
        }
        
        // Initialize the map
        const map = L.map(elementId, {
            center: mapOptions.center,
            zoom: mapOptions.zoom,
            minZoom: mapOptions.minZoom,
            maxZoom: mapOptions.maxZoom
        });
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Store map reference
        maps[elementId] = map;
        
        // Initialize markers and routes containers
        markers[elementId] = {};
        routes[elementId] = {};
        
        return map;
    },
    
    // Update or create a marker for a donor
    updateDonorMarker: function(markerId, position, popupContent, mapId = 'delivery-map') {
        const map = maps[mapId];
        if (!map) {
            console.error(`Map with ID '${mapId}' not found`);
            return null;
        }
        
        // Remove existing marker if it exists
        if (markers[mapId][markerId]) {
            map.removeLayer(markers[mapId][markerId]);
        }
        
        // Create custom icon for donor
        const donorIcon = L.divIcon({
            className: 'donor-marker',
            html: '<div class="marker-icon donor-icon"><i class="bi bi-person-fill"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });
        
        // Create marker
        const marker = L.marker([position.lat, position.lng], {
            icon: donorIcon,
            title: 'Donor'
        }).addTo(map);
        
        // Add popup if content provided
        if (popupContent) {
            marker.bindPopup(popupContent);
        }
        
        // Store marker reference
        markers[mapId][markerId] = marker;
        
        // Center map on marker if it's the only one
        if (Object.keys(markers[mapId]).length === 1) {
            map.setView([position.lat, position.lng], 12);
        } else {
            // Fit bounds to include all markers
            this.fitMapToMarkers(mapId);
        }
        
        return marker;
    },
    
    // Update or create a marker for delivery personnel or hospital
    updateDeliveryMarker: function(markerId, position, popupContent, mapId = 'delivery-map') {
        const map = maps[mapId];
        if (!map) {
            console.error(`Map with ID '${mapId}' not found`);
            return null;
        }
        
        // Remove existing marker if it exists
        if (markers[mapId][markerId]) {
            map.removeLayer(markers[mapId][markerId]);
        }
        
        // Create custom icon based on marker type
        let markerIcon;
        if (markerId === 'hospital') {
            markerIcon = L.divIcon({
                className: 'hospital-marker',
                html: '<div class="marker-icon hospital-icon"><i class="bi bi-hospital-fill"></i></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });
        } else {
            markerIcon = L.divIcon({
                className: 'delivery-marker',
                html: '<div class="marker-icon delivery-icon"><i class="bi bi-truck"></i></div>',
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });
        }
        
        // Create marker
        const marker = L.marker([position.lat, position.lng], {
            icon: markerIcon,
            title: markerId === 'hospital' ? 'Hospital' : 'Delivery Personnel'
        }).addTo(map);
        
        // Add popup if content provided
        if (popupContent) {
            marker.bindPopup(popupContent);
        }
        
        // Store marker reference
        markers[mapId][markerId] = marker;
        
        // Center map on marker if it's the only one
        if (Object.keys(markers[mapId]).length === 1) {
            map.setView([position.lat, position.lng], 12);
        } else {
            // Fit bounds to include all markers
            this.fitMapToMarkers(mapId);
        }
        
        return marker;
    },
    
    // Draw a route between two points
    drawRoute: function(routeId, startPosition, endPosition, mapId = 'delivery-map') {
        const map = maps[mapId];
        if (!map) {
            console.error(`Map with ID '${mapId}' not found`);
            return null;
        }
        
        // Remove existing route if it exists
        if (routes[mapId][routeId]) {
            map.removeLayer(routes[mapId][routeId]);
        }
        
        // Create a simple line for the route (in a real app, you'd use a routing service)
        const routeLine = L.polyline([
            [startPosition.lat, startPosition.lng],
            [endPosition.lat, endPosition.lng]
        ], {
            color: '#3388ff',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10',
            lineJoin: 'round'
        }).addTo(map);
        
        // Store route reference
        routes[mapId][routeId] = routeLine;
        
        return routeLine;
    },
    
    // Clear all markers from a map
    clearAllMarkers: function(mapId = 'delivery-map') {
        const map = maps[mapId];
        if (!map) {
            console.error(`Map with ID '${mapId}' not found`);
            return;
        }
        
        // Remove all markers
        for (const markerId in markers[mapId]) {
            map.removeLayer(markers[mapId][markerId]);
        }
        
        // Clear markers object
        markers[mapId] = {};
    },
    
    // Clear all routes from a map
    clearAllRoutes: function(mapId = 'delivery-map') {
        const map = maps[mapId];
        if (!map) {
            console.error(`Map with ID '${mapId}' not found`);
            return;
        }
        
        // Remove all routes
        for (const routeId in routes[mapId]) {
            map.removeLayer(routes[mapId][routeId]);
        }
        
        // Clear routes object
        routes[mapId] = {};
    },
    
    // Fit map to show all markers
    fitMapToMarkers: function(mapId = 'delivery-map') {
        const map = maps[mapId];
        if (!map) {
            console.error(`Map with ID '${mapId}' not found`);
            return;
        }
        
        // Get all marker positions
        const markerPositions = [];
        for (const markerId in markers[mapId]) {
            const marker = markers[mapId][markerId];
            markerPositions.push(marker.getLatLng());
        }
        
        // If there are markers, fit bounds
        if (markerPositions.length > 0) {
            const bounds = L.latLngBounds(markerPositions);
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15
            });
        }
    },
    
    // Update user's current location on map
    updateCurrentLocation: function(position, mapId = 'delivery-map') {
        return this.updateDeliveryMarker('current-location', position, 'Your current location', mapId);
    }
};