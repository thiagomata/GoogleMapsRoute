/**
 * Traveling in Google Maps — Clean v3 Implementation
 * Single car + multiple cars support
 */

class Vehicle {
    constructor(map, directionsService, index) {
        this.map = map;
        this.directionsService = directionsService;
        this.index = index;
        this.path = [];
        this.marker = null;
        this.travelledPath = [];
        this.travelledPolyline = null;
        this.currentDistance = 0;
        this.totalDistance = 0;
        this.speed = 200;
        this.running = false;
        this.ready = false;

        // 8 directional sprites — all images point UP (North)
        this.sprites = {};
        this.spriteNames = [
            'top', 'top_right', 'right', 'bottom_right',
            'bottom', 'bottom_left', 'left', 'top_left'
        ];
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64;
        this.canvas.height = 64;
    }

    async loadSprites() {
        if (Object.keys(this.sprites).length > 0) return;

        const promises = this.spriteNames.map(name => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `images/${name}.png`;
                img.onload = () => {
                    this.sprites[name] = img;
                    resolve();
                };
            });
        });
        await Promise.all(promises);
    }

    async fetchRoute(origin, destination) {
        const result = await this.directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        });

        if (!result.routes || result.routes.length === 0) {
            throw new Error('No route found');
        }

        // Build path from all step paths
        this.path = [];
        const steps = result.routes[0].legs[0].steps;
        for (const step of steps) {
            for (const point of step.path) {
                this.path.push(point);
            }
        }

        // Calculate total distance
        this.totalDistance = 0;
        for (let i = 1; i < this.path.length; i++) {
            this.totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
                this.path[i - 1],
                this.path[i]
            );
        }

        // Draw the route (full path)
        new google.maps.Polyline({
            path: this.path,
            strokeColor: '#ff0000',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: this.map
        });

        // Draw the travelled path (green, grows as car moves)
        this.travelledPolyline = new google.maps.Polyline({
            path: [],
            strokeColor: '#00cc00',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: this.map
        });

        // Initialize travelled path with starting point
        this.travelledPath.push(this.path[0]);
        this.travelledPolyline.setPath(this.travelledPath);

        // Load sprites
        await this.loadSprites();

        // Create initial sprite
        this.updateSprite(0);

        // Create marker
        this.marker = new google.maps.Marker({
            map: this.map,
            position: this.path[0],
            icon: {
                url: this.canvas.toDataURL(),
                scaledSize: new google.maps.Size(64, 64),
                anchor: new google.maps.Point(32, 32)
            }
        });

        this.ready = true;
    }

    getSpriteName(bearing) {
        bearing = (bearing + 360) % 360;
        const index = Math.round(bearing / 45) % 8;
        return this.spriteNames[index];
    }

    updateSprite(bearing) {
        const spriteName = this.getSpriteName(bearing);
        const img = this.sprites[spriteName];
        if (!img) return;

        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);
        ctx.save();
        ctx.translate(32, 32);
        ctx.rotate(bearing * Math.PI / 180);
        ctx.drawImage(img, -32, -32, 64, 64);
        ctx.restore();
    }

    getPositionAtDistance(distance) {
        if (distance <= 0) return this.path[0];
        if (distance >= this.totalDistance) return this.path[this.path.length - 1];

        let accumulated = 0;
        for (let i = 1; i < this.path.length; i++) {
            const segmentDist = google.maps.geometry.spherical.computeDistanceBetween(
                this.path[i - 1],
                this.path[i]
            );

            if (accumulated + segmentDist >= distance) {
                const fraction = (distance - accumulated) / segmentDist;
                const lat = this.path[i - 1].lat() + (this.path[i].lat() - this.path[i - 1].lat()) * fraction;
                const lng = this.path[i - 1].lng() + (this.path[i].lng() - this.path[i - 1].lng()) * fraction;
                return new google.maps.LatLng(lat, lng);
            }

            accumulated += segmentDist;
        }

        return this.path[this.path.length - 1];
    }

    getBearingAtDistance(distance) {
        const pos = this.getPositionAtDistance(distance);
        const ahead = this.getPositionAtDistance(Math.min(distance + 10, this.totalDistance));
        return google.maps.geometry.spherical.computeHeading(pos, ahead);
    }

    animate(timestamp) {
        if (!this.running) return;

        if (this.lastTimestamp) {
            const delta = (timestamp - this.lastTimestamp) / 1000;
            this.currentDistance += delta * this.speed;

            if (this.currentDistance >= this.totalDistance) {
                this.currentDistance = this.totalDistance;
                this.running = false;
                return;
            }

            const position = this.getPositionAtDistance(this.currentDistance);
            const bearing = this.getBearingAtDistance(this.currentDistance);

            // Add position to travelled path only if moved enough (avoid point spam)
            const lastPoint = this.travelledPath[this.travelledPath.length - 1];
            const distFromLast = google.maps.geometry.spherical.computeDistanceBetween(lastPoint, position);
            if (distFromLast > 50) {
                this.travelledPath.push(position);
                this.travelledPolyline.setPath(this.travelledPath);
            }

            // Update sprite and marker icon
            this.updateSprite(bearing);
            this.marker.setIcon({
                url: this.canvas.toDataURL(),
                scaledSize: new google.maps.Size(64, 64),
                anchor: new google.maps.Point(32, 32)
            });
            this.marker.setPosition(position);
        }

        this.lastTimestamp = timestamp;
    }

    start() {
        this.running = true;
        this.lastTimestamp = 0;
    }

    stop() {
        this.running = false;
    }
}

class Fleet {
    constructor(map) {
        this.map = map;
        this.directionsService = new google.maps.DirectionsService();
        this.vehicles = [];
        this.running = false;
        this.currentZoom = 10;  // Start zoomed out to fit all cars
    }

    addVehicle(vehicle) {
        this.vehicles.push(vehicle);
    }

    async createCar(lat1, lng1, lat2, lng2) {
        const vehicle = new Vehicle(this.map, this.directionsService, this.vehicles.length);
        const origin = { lat: lat1, lng: lng1 };
        const destination = { lat: lat2, lng: lng2 };

        try {
            await vehicle.fetchRoute(origin, destination);
            this.addVehicle(vehicle);
        } catch (error) {
            console.error('Failed to create car:', error);
        }
    }

    animate(timestamp) {
        if (!this.running) return;

        let anyRunning = false;
        for (const vehicle of this.vehicles) {
            vehicle.animate(timestamp);
            if (vehicle.running) {
                anyRunning = true;
            }
        }

        // Camera tracking — include ALL vehicles (active and finished)
        const bounds = new google.maps.LatLngBounds();
        for (const vehicle of this.vehicles) {
            const pos = vehicle.getPositionAtDistance(vehicle.currentDistance);
            bounds.extend(pos);
        }

        // Add padding to bounds so vehicles don't touch edges
        const padding = 0.15;  // 15% padding on each side
        const latCenter = (bounds.getNorthEast().lat() + bounds.getSouthWest().lat()) / 2;
        const lngCenter = (bounds.getNorthEast().lng() + bounds.getSouthWest().lng()) / 2;
        const latSpan = Math.abs(bounds.getNorthEast().lat() - bounds.getSouthWest().lat()) || 0.01;
        const lngSpan = Math.abs(bounds.getNorthEast().lng() - bounds.getSouthWest().lng()) || 0.01;
        
        // Rebuild bounds with padding
        bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(latCenter - latSpan * (0.5 + padding), lngCenter - lngSpan * (0.5 + padding)),
            new google.maps.LatLng(latCenter + latSpan * (0.5 + padding), lngCenter + lngSpan * (0.5 + padding))
        );

        // Smooth pan — move 1/5 of the way toward target center
        const currentCenter = this.map.getCenter();
        const targetCenter = bounds.getCenter();
        const latDiff = targetCenter.lat() - currentCenter.lat();
        const lngDiff = targetCenter.lng() - currentCenter.lng();
        const newCenter = new google.maps.LatLng(
            currentCenter.lat() + latDiff / 5,
            currentCenter.lng() + lngDiff / 5
        );
        this.map.setCenter(newCenter);

        // Auto-zoom based on bounds
        const targetZoom = this.calculateBoundsZoom(bounds);
        const zoomDelta = targetZoom - this.currentZoom;
        if (Math.abs(zoomDelta) > 0.3) {
            // Faster zoom: move 1/5 of the way toward target
            this.currentZoom += zoomDelta / 5;
            this.map.setZoom(Math.round(this.currentZoom));
            console.log(`Zoom: ${this.currentZoom.toFixed(1)} (target: ${targetZoom.toFixed(1)})`);
        }

        if (anyRunning) {
            requestAnimationFrame(this.animate.bind(this));
        } else {
            this.running = false;
            document.getElementById('status').textContent = 'All vehicles arrived!';
        }
    }

    calculateBoundsZoom(bounds) {
        const TILE_SIZE = 256;
        const mapDiv = this.map.getDiv();
        const mapWidth = mapDiv.offsetWidth;
        const mapHeight = mapDiv.offsetHeight;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const latFraction = (ne.lat() - sw.lat()) / 180;
        const lngDiff = ne.lng() - sw.lng();
        const lngFraction = ((lngDiff < 0 ? lngDiff + 360 : lngDiff)) / 360;

        const latZoom = Math.log((mapHeight * 2 / TILE_SIZE) / latFraction) / Math.LN2;
        const lngZoom = Math.log((mapWidth * 2 / TILE_SIZE) / lngFraction) / Math.LN2;

        // Calculate the zoom level that fits the bounds
        return Math.max(Math.min(latZoom, lngZoom), 8);
    }

    start() {
        this.running = true;
        for (const vehicle of this.vehicles) {
            vehicle.start();
        }
        requestAnimationFrame(this.animate.bind(this));
    }
}

let fleet;

function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -33.8688, lng: 151.2093 },
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    fleet = new Fleet(map);
}

async function startDemo() {
    if (fleet) {
        fleet.stop();
    }

    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -33.8688, lng: 151.2093 },
        zoom: 10
    });

    fleet = new Fleet(map);

    // Create 4 cars with spread-out routes to test zoom
    const routes = [
        { from: [-33.8688, 151.2093], to: [-33.7500, 150.9500] },  // CBD to Penrith (far west)
        { from: [-33.8700, 151.2100], to: [-34.0500, 151.1000] },  // CBD to Cronulla (far south)
        { from: [-33.8650, 151.2050], to: [-33.8300, 151.2800] },  // CBD to Manly (north)
        { from: [-33.8600, 151.2000], to: [-33.8100, 151.0200] },  // CBD to Blacktown (west)
    ];

    document.getElementById('status').textContent = 'Loading routes...';

    // Load all routes in parallel
    const promises = routes.map((r, i) =>
        fleet.createCar(r.from[0], r.from[1], r.to[0], r.to[1])
            .then(() => console.log(`Car ${i + 1} ready`))
    );

    await Promise.all(promises);

    document.getElementById('status').textContent = `${fleet.vehicles.length} cars loaded`;

    // Sync initial zoom from the map's current zoom
    fleet.currentZoom = map.getZoom();

    fleet.start();
}
