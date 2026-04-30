/**
 * Traveling in Google Maps — Clean v3 Implementation
 * Phase 1: Single vehicle on a known route
 * Phase 2: 8-directional sprite rotation
 */

class RouteAnimator {
    constructor(map) {
        this.map = map;
        this.directionsService = new google.maps.DirectionsService();
        this.path = [];
        this.marker = null;
        this.currentDistance = 0;
        this.totalDistance = 0;
        this.speed = 80;
        this.running = false;
        this.lastTimestamp = 0;

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
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Fetching route...';

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

        statusEl.textContent = `Route loaded: ${Math.round(this.totalDistance)}m, ${this.path.length} points`;

        // Draw the route
        new google.maps.Polyline({
            path: this.path,
            strokeColor: '#ff0000',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: this.map
        });

        // Load all 8 directional sprites
        await this.loadSprites();

        // Create initial sprite
        this.updateSprite(0);

        // Create marker with canvas icon
        this.marker = new google.maps.Marker({
            map: this.map,
            position: this.path[0],
            icon: {
                url: this.canvas.toDataURL(),
                scaledSize: new google.maps.Size(64, 64),
                anchor: new google.maps.Point(32, 32)
            }
        });

        // Fit map to route
        const bounds = new google.maps.LatLngBounds();
        this.path.forEach(p => bounds.extend(p));
        this.map.fitBounds(bounds);
    }

    getSpriteName(bearing) {
        bearing = (bearing + 360) % 360;
        const index = Math.round(bearing / 45) % 8;
        return this.spriteNames[index];
    }

    updateSprite(bearing) {
        // Pick the closest sprite and rotate it by the full bearing
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
                document.getElementById('status').textContent = 'Arrived!';
                return;
            }

            const position = this.getPositionAtDistance(this.currentDistance);
            const bearing = this.getBearingAtDistance(this.currentDistance);

            // Update sprite and marker icon
            this.updateSprite(bearing);
            this.marker.setIcon({
                url: this.canvas.toDataURL(),
                scaledSize: new google.maps.Size(64, 64),
                anchor: new google.maps.Point(32, 32)
            });
            this.marker.setPosition(position);

            document.getElementById('status').textContent =
                `${Math.round(this.currentDistance)}m / ${Math.round(this.totalDistance)}m`;
        }

        this.lastTimestamp = timestamp;
        requestAnimationFrame(this.animate.bind(this));
    }

    start() {
        this.running = true;
        this.lastTimestamp = 0;
        requestAnimationFrame(this.animate.bind(this));
    }

    stop() {
        this.running = false;
    }
}

let animator;

function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -33.8688, lng: 151.2093 },
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    animator = new RouteAnimator(map);
}

async function startDemo() {
    if (animator) {
        animator.stop();
    }

    const origin = 'Circular Quay, Sydney NSW';
    const destination = 'Parramatta, Sydney NSW';

    animator = new RouteAnimator(
        new google.maps.Map(document.getElementById('map'), {
            center: { lat: -33.8688, lng: 151.2093 },
            zoom: 12
        })
    );

    try {
        await animator.fetchRoute(origin, destination);
        animator.start();
    } catch (error) {
        document.getElementById('status').textContent = 'Error: ' + error.message;
        console.error('Full error:', error);
    }
}
