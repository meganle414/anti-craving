import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Circle, Marker, InfoWindow } from '@react-google-maps/api';
import './MapComponent.css';

const MapComponent = () => {
  const [map, setMap] = useState(null);
  const [radius, setRadius] = useState(5000); // 5km by default ~= 3 mi
  const [showRadius, setShowRadius] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [antiCravings, setAntiCravings] = useState([]);
  const [location, setLocation] = useState({ lat: 41.8781, lng: -87.6298 }); // Default to Chicago
  // const [location, setLocation] = useState({ lat: 32.7157, lng: -117.1611 }); // Default to San Diego
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const fetchRestaurants = (filters) => {
    const service = new window.google.maps.places.PlacesService(map);
    const request = {
      location,
      radius,
      type: ['restaurant'],
      keyword: filters.cuisines.join(','),
      openNow: filters.openNow,
      minPriceLevel: filters.minPrice,
      maxPriceLevel: filters.maxPrice,
      rating: filters.rating,
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setRestaurants(results);
      }
    });
  };

  useEffect(() => {
    if (map) {
      map.setCenter(location);
      fetchRestaurants({ cuisines: ['sushi'], openNow: true, rating: 4, minPrice: 1, maxPrice: 4 });
    }
  }, [map, location, radius, antiCravings]);

  const handleMarkerClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const getPhotoUrl = (photos) => {
    if (photos && photos.length > 0) {
      return photos[0].getUrl({ maxWidth: 250 });
    }
    return null;
  };

  return (
    <div className="Map" style={{ position: 'relative', height: '735px', width: '100%' }}>
      <LoadScript googleMapsApiKey="AIzaSyBmbwB277k3onIGaeJkRrBz9E2jnrXLeLc" libraries={["places"]} >
      <GoogleMap
        center={location}
        zoom={12}
        mapContainerStyle={{ height: '100%', width: '100%' }}
        onLoad={map => {
          setMap(map);
          if (navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
              ({ coords: { latitude: lat, longitude: lng } }) => {
                const pos = { lat, lng };
                setLocation(pos);
              },
              (error) => {
                if (error.code === error.PERMISSION_DENIED) {
                  console.log('Permission denied, prompt user again.');
                } else {
                  console.error('Error getting location', error);
                }
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
          }
        }}
        options={{
          streetViewControl: false,
          styles: [
            {
              featureType: "poi",
              stylers: [{ visibility: "off" }] // Disable points of interest
            },
            {
              featureType: "transit",
              stylers: [{ visibility: "off" }] // Disable transit stations
            },
            {
              featureType: "road",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }] // Disable road icons
            },
          ],
        }}
        >
        {showRadius && (
          <Circle
            center={location}
            radius={radius}
            options={{
              strokeColor: '#5D94D6', // Blue stroke
              strokeOpacity: 0.8,     // Opacity of the border
              strokeWeight: 2,        // Width of the border
              fillColor: '#C8E2FF',   // Blue fill color
              fillOpacity: 0.1,      // Opacity of the fill
            }}
          />
        )}
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.place_id}
            position={{
              lat: restaurant.geometry.location.lat(),
              lng: restaurant.geometry.location.lng(),
            }}
            title={restaurant.name}
            onClick={() => handleMarkerClick(restaurant)}
            icon={{
              url: 'https://www.freeiconspng.com/thumbs/restaurant-icon-png/pink-restaurants-icon-19.png',
              scaledSize: new window.google.maps.Size(40, 40), // Adjust the size if necessary
            }}
          />
        ))}
        {showRadius && <Circle center={location} radius={radius} visible={showRadius} />}
      </GoogleMap>
      </LoadScript>

      {/* Show/Hide Radius Button */}
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}>
        <button
          onClick={() => setShowRadius(!showRadius)}
          style={{ padding: '10px', backgroundColor: showRadius ? 'red' : 'green', color: 'white', cursor: 'pointer' }}
        >
          {showRadius ? 'Hide Radius' : 'Show Radius'}
        </button>
      </div>

      {/* Overlay List View */}
      {(restaurants || antiCravings) && (
        <div style={{
          position: 'absolute',
          top: '0px',
          left: '0px',
          backgroundColor: 'rgba(255, 255, 255, 1)',
          padding: '10px',
          height: '100%',
          width: '22%',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black'
        }}>
          <ul>
            {restaurants.map((restaurant) => (
              <li key={restaurant.place_id} onClick={() => handleMarkerClick(restaurant)}>
                {restaurant.name}<br></br>
                {restaurant.rating} stars ${restaurant.minPrice}{restaurant.minPriceLevel}-{restaurant.maxPrice}{restaurant.maxPriceLevel}<br></br>
                <img
                  src={getPhotoUrl(restaurant.photos)} 
                  alt="restaurant" 
                  style={{
                    width: '20%',
                    height: 'auto',
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Selected Restaurant Overlay View */}
      {selectedRestaurant && (
        <div style={{
          position: 'absolute',
          top: '50px',
          bottom: '50px',
          left: '24%',
          backgroundColor: 'rgba(255, 255, 255, 1)',
          borderRadius: '8px',
          padding: '0px',
          width: '20%',
          height: '660px',
          maxHeight: '660px',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black',
        }}>
          <button onClick={() => setSelectedRestaurant(null)}
            style={{ 
              background: 'white', 
              border: 'none', 
              borderRadius: '50%', 
              color: 'black', 
              fontSize: '16px', 
              width: '30px', 
              height: '30px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              position: 'absolute', 
              top: '10px', 
              right: '10px', 
              zIndex: 1001
            }}
          >
            X
          </button>
          <div style={{
              // this did nothing?
              // alignItems: 'left', 
              // justifyContent: 'left', 
            }}
          >
            {selectedRestaurant.photos && selectedRestaurant.photos.length > 0 && (
              <img
              src={getPhotoUrl(selectedRestaurant.photos)} 
              alt="selected restaurant" 
              style={{
                  width: '100%',
                  height: 'auto',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                }}
              />
            )}
            <h3>{selectedRestaurant.name}</h3>
            <p>{selectedRestaurant.vicinity}</p>
            <p>{selectedRestaurant.rating} stars ${selectedRestaurant.minPrice}{selectedRestaurant.minPriceLevel}-{selectedRestaurant.maxPrice}{selectedRestaurant.maxPriceLevel}</p>
            {/* Add more details as needed */}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;