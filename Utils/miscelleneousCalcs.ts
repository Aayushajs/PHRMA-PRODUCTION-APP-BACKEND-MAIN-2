export function calculateDistance(userLat: number, userLng: number, storeLat: number, storeLng: number) {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(storeLat - userLat);
    const dLon = toRadians(storeLng - userLng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(userLat)) * Math.cos(toRadians(storeLat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}