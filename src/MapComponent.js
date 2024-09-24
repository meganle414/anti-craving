import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import './MapComponent.css';

const MapComponent = () => {
  const [map, setMap] = useState(null);
  const [radius, setRadius] = useState(4828); // ~3 miles by default
  const [restaurants, setRestaurants] = useState([]);
  const [antiRestaurants, setAntiRestaurants] = useState([]);
  const [cravings, setCravings] = useState([]);
  const [antiCravings, setAntiCravings] = useState([]);
  const [location, setLocation] = useState({ lat: 41.8781, lng: -87.6298 }); // Default to Chicago
  const [currentLocationMarker, setCurrentLocationMarker] = useState(null);
  const [currentCircle, setCurrentCircle] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [pricesFilter, setPricesFilter] = useState([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const autocompleteRef = useRef(null);

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
      fetchRestaurants({ cuisines: ['sushi'], openNow: true, rating: 4, minPrice: 1, maxPrice: 4 });
    }
  }, [map, location, radius, cravings, antiCravings]);

  const handleMarkerClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const getPhotoUrl = (photos) => {
    if (photos && photos.length > 0) {
      return photos[0].getUrl({ maxWidth: 250 });
    }
    return null;
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (place && place.geometry) {
      const newLocation = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      setLocation(newLocation);
      map.setCenter(newLocation);
      updateLocationMarker(newLocation);
    }
  };

  const updateLocationMarker = (pos) => {
    if (currentLocationMarker) {
      currentLocationMarker.setMap(null); // Remove the previous marker
    }

    // Add the new marker for the user's location
    const newMarker = new window.google.maps.Marker({
      position: pos,
      map,
      icon: {
        url: 'https://www.clker.com/cliparts/2/u/U/A/S/B/yellow-standing-man-icon-hi.png',
        scaledSize: new window.google.maps.Size(20, 45),
      },
    });

    setCurrentLocationMarker(newMarker);
    updateCircle(pos);
  };

  const updateCircle = (pos) => {
    if (currentCircle) {
      currentCircle.setMap(null); // Remove the previous circle
    }

    // Add the new circle
    const newCircle = new window.google.maps.Circle({
      center: pos,
      radius: radius * 1.3,  // to account for when fetchRestaurants sometimes finds restaurants outside of the radius
      map,
      strokeColor: '#5D94D6',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#5D94D6',
      fillOpacity: 0.2,
    });

    setCurrentCircle(newCircle);
  };

  return (
    <div className="Map" style={{ position: 'relative', height: '735px', width: '100%' }}>
      <LoadScript googleMapsApiKey="AIzaSyBmbwB277k3onIGaeJkRrBz9E2jnrXLeLc" libraries={["places"]} >
      {/* Search Bar for Address Lookup with Autocomplete */}
      <div style={{ position: 'absolute', zIndex: 1001, width: '22%', backgroundColor: "white" }}>
        <div className="Address-search" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1001, width: '94%' }}>
          <Autocomplete
            onLoad={(autocomplete) => {
                autocompleteRef.current = autocomplete;
            }}
            onPlaceChanged={handlePlaceChanged}
          >
            <input
              type="text"
              placeholder="Enter an address"
              style={{ width: '100%', padding: '10px', borderRadius: '50px' }}
            />
          </Autocomplete>
        </div>
      </div>
      <GoogleMap
        center={location}
        zoom={12}
        mapContainerStyle={{ height: '100%', width: '100%' }}
        onLoad={map => {
          setMap(map);
          setLocation(location);
          map.setCenter(location);
          updateLocationMarker(location);
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
            { featureType: "poi", stylers: [{ visibility: "off" }]}, // Disable points of interest
            { featureType: "transit", stylers: [{ visibility: "off" }]}, // Disable transit stations
            { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }]}, // Disable road icons
          ],
        }}
        >

        {/* Restaurant Markers */}
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
              url: selectedRestaurant === restaurant
                ? 'https://i.imgur.com/xwUdnAf.png' // Red marker for selected restaurant
                : 'https://i.imgur.com/an6s4x2.png', // Custom marker for unselected restaurants
              scaledSize: selectedRestaurant === restaurant
                ? new window.google.maps.Size(45, 45)  // Larger size for selected restaurant
                : new window.google.maps.Size(30, 30), // Smaller size for unselected restaurants
            }}
          />
        ))}
      </GoogleMap>
      </LoadScript>

      {/* Overlay List View */}
      {(restaurants || antiCravings) && (
        <div style={{
          position: 'absolute',
          bottom: '0px',
          left: '0px',
          backgroundColor: 'white',
          padding: '10px',
          height: '90%',
          width: '22%',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black',
          textAlign: 'left',
          scrollbarWidth: 'thin',          // For Firefox
          scrollbarColor: 'gray lightgray' // For Firefox
        }}>
          <style>
            {`
              /* For WebKit browsers (Chrome, Safari, Edge) */
              div::-webkit-scrollbar {
                width: 6px; /* Slim scrollbar width */
              }
              div::-webkit-scrollbar-track {
                background: transparent; /* Background of the track */
              }
              div::-webkit-scrollbar-thumb {
                background-color: gray; /* Scrollbar color */
                border-radius: 10px;     /* Rounded edges */
              }
              div::-webkit-scrollbar-thumb:hover {
                background-color: darkgray; /* Darker on hover */
              }
              div::-webkit-scrollbar-button {
                display: none; /* Remove scrollbar arrows/buttons */
              }
            `}
          </style>
          <h1>Results</h1>
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
          top: '60px',
          bottom: '50px',
          left: '24%',
          backgroundColor: 'white',
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

      {/* Filters Overlay View */}
      {/* price */}
      {/* $, $$, $$$, $$$$ */}
      <div className='price-dropdown'
          style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '24%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '6%',
          height: '45px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          // justifyContent: 'center',
          // paddingLeft: '5px',
          // paddingRight: '5px',
        }}>
          <button className='price-dropdown-btn'>
            <label>
              {pricesFilter.length === 0 ? <img src='https://t3.ftcdn.net/jpg/05/29/34/86/360_F_529348660_zJmzCQVAsjm39091iW7IAQaUoGFs3BrG.jpg' alt='cash' width={25}/> : <img src='https://www.dat.com/blog/wp-content/uploads/2023/07/checkmark_dat_blue-01_720.png' alt='checkmark' width={25}/>} {pricesFilter.length === 0 ? "Prices" : pricesFilter.join(', ')} ▼
            </label>
          </button>
      </div>

      <div className='price-dropdown-options'
          style={{
          position: 'absolute',
          top: '70px',
          bottom: '50px',
          left: '24%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '4%',
          height: '150px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1002,
          color: 'black',
          paddingLeft: '10px',
          paddingRight: '15px',
        }}>
          <div class="price-dropdown-content">
            <input type="checkbox" id="$" name="$" value="$" />
            <label for="$">$</label><br />
            <input type="checkbox" id="$$" name="$$" value="$$" />
            <label for="$$">$$</label><br />
            <input type="checkbox" id="$$$" name="$$$" value="$$$" />
            <label for="$$$">$$$</label><br />
            <input type="checkbox" id="$$$$" name="$$$$" value="$$$$" />
            <label for="$$$$">$$$$</label><br />
            <button className='clear-btn'>Clear</button><button className='done-button'>Done</button>
          </div>
        </div>

      {/* rating */}
      {/* Any rating, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5 */}

      {/* cravings (cuisines) */}
      {/* American, Barbecue, Chinese, French, Hamburger, Indian, Italian, Japanese, Mexican, Pizza, Seafood, Steak, Sushi, Thai, Clear */}

      {/* anti-cravings (cuisines) */}
      {/* American, Barbecue, Chinese, French, Hamburger, Indian, Italian, Japanese, Mexican, Pizza, Seafood, Steak, Sushi, Thai, Clear */}

      {/* hours (open/closed) */}
      {/* Any time, Open now, Open 24 hours */}

      {/* radius (slider) */}
      <div style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '50%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '17%',
          height: '45px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1000,
          display: 'flex', // Use flexbox
          alignItems: 'center', // Vertically align items
          paddingLeft: '10px',
          paddingRight: '10px',
          gap: '10px' // Space between label and slider
        }}>
          <label>Distance:</label>
          <input
            id="radius-slider"
            type="range"
            min="0.5"
            max="10"
            value={(radius / 1609.34).toFixed(1)}
            step="0.5"
            onChange={(e) => {
              const miles = parseFloat(e.target.value); // Get the slider value in miles
              const meters = miles * 1609.34; // Convert miles to meters
              setRadius(meters); // Update the radius in meters
              updateCircle(location); // Redraw the circle with the new radius
            }}
            style={{ width: '50%' }}
          />
          <label>{(radius / 1609.34).toFixed(1)} miles</label>
      </div>

      {/* all filters */}
      {/* z-index 1001 to go above the restaurant list */}
    </div>
  );
};

export default MapComponent;