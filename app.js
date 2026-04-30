/**
 * Traveling in Google Maps — Clean v3 Implementation
 * Phase 1: Single vehicle on a known route
 */

class RouteAnimator {
    constructor(map) {
        this.map = map;
        this.directionsService = new google.maps.DirectionsService();
        this.path = [];         // Array of google.maps.LatLng
        this.marker = null;
        this.currentDistance = 0;
        this.totalDistance = 0;
        this.speed = 50;        // meters per second
        this.running = false;
        this.lastTimestamp = 0;
    }

    async fetchRoute(origin, destination) {
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Fetching route...';

        const result = await this.directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        });

        // result is already the valid DirectionsResult, no status check needed
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

        // Draw the route - bright red for visibility
        new google.maps.Polyline({
            path: this.path,
            strokeColor: '#ff0000',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: this.map
        });

        // Create animated marker
        this.marker = new google.maps.Marker({
            map: this.map,
            position: this.path[0],
            icon: {
                url: 'images/top.png',
                scaledSize: new google.maps.Size(24, 24)
            }
        });

        // Fit map to route
        const bounds = new google.maps.LatLngBounds();
        this.path.forEach(p => bounds.extend(p));
        this.map.fitBounds(bounds);
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
        const ahead = this.getPositionAtDistance(Math.min(distance + 50, this.totalDistance));
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

            this.marker.setPosition(position);
            this.marker.setIcon({
                url: 'images/top.png',
                scaledSize: new google.maps.Size(24, 24),
                rotation: bearing,
                anchor: new google.maps.Point(12, 12)
            });

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
        center: { lat: -33.8688, lng: 151.2093 },  // Sydney
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    animator = new RouteAnimator(map);
}

async function startDemo() {
    if (animator) {
        animator.stop();
    }

    // Known addresses with guaranteed driving route
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
        if (error.response) {
            console.error('Error response:', error.response);
        }
    }
}
