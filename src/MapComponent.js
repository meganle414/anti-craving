import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { FaSearch, FaCaretDown, FaCheck, FaRegMoneyBillAlt, FaStar, FaStarHalfAlt, FaHamburger, FaTimes, FaClock } from 'react-icons/fa';
import './MapComponent.css';

const MapComponent = () => {
  const [map, setMap] = useState(null);
  const [radius, setRadius] = useState(4828); // ~3 miles by default
  const [location, setLocation] = useState({ lat: 41.8781, lng: -87.6298 }); // Default to Chicago

  // informaiton about current selections
  const [currentLocationMarker, setCurrentLocationMarker] = useState(null);
  const [currentCircle, setCurrentCircle] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [previewRestaurant, setPreviewRestaurant] = useState(null);

  // filter options (data)
  const [restaurants, setRestaurants] = useState([]);
  const [antiRestaurants, setAntiRestaurants] = useState([]);
  const [pricesFilter, setPricesFilter] = useState([]);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [cravings, setCravings] = useState([]);
  const [antiCravings, setAntiCravings] = useState([]);
  const [hoursFilter, setHoursFilter] = useState(["Any time"]);

  // whether scrolled or not on menu list
  const [isScrolled, setIsScrolled] = useState(false);

  // dropdown/filter option choices
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
  const [isRatingDropdownOpen, setIsRatingDropdownOpen] = useState(false);
  const [isCravingDropdownOpen, setIsCravingDropdownOpen] = useState(false);
  const [isAntiCravingDropdownOpen, setIsAntiCravingDropdownOpen] = useState(false);
  const [isHoursDropdownOpen, setIsHoursDropdownOpen] = useState(false);
  const [isAllFiltersOpen, setIsAllFiltersOpen] = useState(false);

  const priceOptions = ['$', '$$', '$$$', '$$$$'];
  const hoursOptions = ['Any time', 'Open now', 'Open 24 hours'];
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
      updateLocationMarker(location);
      // fetchRestaurants({ cuisines: ['sushi'], openNow: true, rating: 4, minPrice: 1, maxPrice: 4 });
    }
  }, [map, location, cravings, antiCravings]);

  

  const handleMarkerClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  const handlePreviewMarker = (restaurant) => {
    setPreviewRestaurant(restaurant);
  }

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
    // need to refetch restaurants in this area
  };

  const selectFirstSuggestion = () => {
    const autocompleteService = new window.google.maps.places.AutocompleteService();
    const inputValue = autocompleteRef.current.input.value;

    autocompleteService.getPlacePredictions({ input: inputValue }, (predictions, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions.length) {
        const firstPrediction = predictions[0];
        const placeService = new window.google.maps.places.PlacesService(map);
        
        placeService.getDetails({ placeId: firstPrediction.place_id }, (placeDetails) => {
          if (placeDetails && placeDetails.geometry) {
            const newLocation = {
              lat: placeDetails.geometry.location.lat(),
              lng: placeDetails.geometry.location.lng(),
            };
            setLocation(newLocation);
            map.setCenter(newLocation);
            updateLocationMarker(newLocation);
          }
        });
      }
    });
  };

  const handleScroll = (event) => {
    const scrollTop = event.target.scrollTop;
    setIsScrolled(scrollTop > 0);  // Set to true if user scrolls down
  };

  const handleRecenterClick = () => {
    map.setCenter(location);
  }
  
  const handlePriceSelection = (price) => {
    let updatedPrices;
    if (pricesFilter.includes(price)) {
      updatedPrices = pricesFilter.filter(p => p !== price); // Deselect price
    } else {
      updatedPrices = [...pricesFilter, price]; // Select price
    }

    // Sort prices based on the order of priceOptions
    updatedPrices.sort((a, b) => priceOptions.indexOf(a) - priceOptions.indexOf(b));
    setPricesFilter(updatedPrices);
  };

  const formatPriceDisplay = () => {
    if (pricesFilter.length === 0) return '';
    if (pricesFilter.length === 1) return pricesFilter;
  
    const priceIndices = pricesFilter.map(price => priceOptions.indexOf(price));
    const minPriceIndex = Math.min(...priceIndices);
    const maxPriceIndex = Math.max(...priceIndices);
  
    if (maxPriceIndex - minPriceIndex === pricesFilter.length - 1) {
      return `${priceOptions[minPriceIndex]}-${priceOptions[maxPriceIndex]}`; // Continuous range
    }
    return pricesFilter.join(', '); // Non-continuous values
  };

  const clearPriceFilter = () => {
    setPricesFilter([]); // Clear selected prices
  };

  const donePriceFilter = () => {
    setIsPriceDropdownOpen(false);
  };

  const handleAnyRating = () => {
    setRatingFilter(0); // Clears the rating filter
    setIsRatingDropdownOpen(false);
  };
  
  const handleRatingSelection = (rating) => {
    setRatingFilter(rating); // Set rating and close dropdown
    setIsRatingDropdownOpen(false);
  };

  const handleCravingSelection = (craving) => {
    if (cravings.includes(craving)) {
      setCravings(cravings.filter(c => c !== craving)); // Deselect craving
    } else {
      setCravings([...cravings, craving]); // Select craving
    }
  }

  const handleAnyCraving = () => {
    setCravings([]); // Clears the cravings filter
    setIsCravingDropdownOpen(false);
  }

  const handleAntiCravingSelection = (antiCraving) => {
    if (antiCravings.includes(antiCraving)) {
      setAntiCravings(antiCravings.filter(c => c !== antiCraving)); // Deselect anti-craving
    } else {
      setAntiCravings([...antiCravings, antiCraving]); // Select anti-craving
    }
  }

  const handleClearAntiCraving = () => {
    setAntiCravings([]); // Clears the anti-cravings filter
    setIsAntiCravingDropdownOpen(false);
  }

  const handleHoursSelection = (hour) => {
    setHoursFilter(hour);
  }

  const clearHoursFilter = () => {
    setHoursFilter("Any time");
  }

  const applyHoursFilter = () => {
    setIsHoursDropdownOpen(false);
  }

  const getStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const decimal = rating % 1;
  
    // Push full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} style={{ color: 'orange' }} />);
    }
  
    // Determine whether to add a half star or a full star for the remaining decimal part
    if (decimal > 0.7) {
      stars.push(<FaStar key="full" style={{ color: 'orange' }} />);
    } else if (decimal > 0.2) {
      stars.push(<FaStarHalfAlt key="half" style={{ color: 'orange' }} />);
    }
  
    // Fill remaining stars up to 5
    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<FaStar key={i + fullStars + 1} style={{ color: 'gray' }} />);
    }
  
    return stars;
  };  

  return (
    <div className="Map" style={{ position: 'relative', height: '735px', width: '100%' }}>
      <LoadScript googleMapsApiKey="AIzaSyBmbwB277k3onIGaeJkRrBz9E2jnrXLeLc" libraries={["places"]} >
      {/* Search Bar for Address Lookup with Autocomplete */}
      <div style={{ position: 'absolute', zIndex: 1001, width: '23%', height: '8%', backgroundColor: "white", boxShadow: isScrolled ? '0 4px 2px -2px rgba(0, 0, 0, 0.3)' : 'none' }}>
        <div className="Address-search" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1001, width: '85%' }}>
          <Autocomplete
            onLoad={(autocomplete) => {
                autocompleteRef.current = autocomplete;
            }}
            onPlaceChanged={handlePlaceChanged}
          >
            <input
              type="text"
              placeholder="Enter an address"
              style={{ width: '100%', padding: '10px 10px 10px 30px', borderRadius: '50px', border: '1px solid #ccc' }}
            />
          </Autocomplete>
        </div>
        <button onClick={selectFirstSuggestion} style={{ marginLeft: '8px', padding: '5px 10px', borderRadius: '5px', zIndex: 1002 }}>
          <FaSearch style={{ position: 'absolute', top: '50%', left: '10px', transform: 'translateY(-50%)', color: 'gray' }} />
        </button>
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
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }]}, // Disable points of interest
            { featureType: "transit", stylers: [{ visibility: "off" }]}, // Disable transit stations
            { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }]}, // Disable road icons
          ],
        }}
        >
        {/* Restaurant Markers */}
        {restaurants.map((restaurant) => (
          <React.Fragment key={restaurant.place_id}>
            <Marker
              position={{
                lat: restaurant.geometry.location.lat(),
                lng: restaurant.geometry.location.lng(),
              }}
              title={restaurant.name}
              onClick={() => handleMarkerClick(restaurant)}
              onMouseOver={() => handlePreviewMarker(restaurant)}
              onMouseOut={() => setPreviewRestaurant(null)}
              icon={{
                url: (selectedRestaurant === restaurant || previewRestaurant === restaurant)
                  ? 'https://i.imgur.com/xwUdnAf.png' // Red marker for selected/previewed restaurant
                  : 'https://i.imgur.com/an6s4x2.png', // Custom marker for unselected restaurants
                scaledSize: (selectedRestaurant === restaurant || previewRestaurant === restaurant)
                  ? new window.google.maps.Size(45, 45)  // Larger size for selected/previewed restaurant
                  : new window.google.maps.Size(30, 30), // Smaller size for unselected restaurants
              }}
            />
            {/* Restaurant Name */}
            <div
              style={{
                position: 'absolute',
                top: '-10px',
                left: '40px', // Shift the label to the right of the marker. May need to adjust more
                backgroundColor: 'transparent',
                padding: '0px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
              }}
            >
              {restaurant.name}
            </div>
          </React.Fragment>
        ))}
      </GoogleMap>
      </LoadScript>

      {/* Overlay List View */}
      {(restaurants || antiCravings) && (
        <div onScroll={handleScroll}
          style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
            backgroundColor: 'white',
            // paddingLeft: '10px',
            paddingRight: '10px',
            height: '92%',
            width: '22%',
            overflowY: 'auto',
            zIndex: 1000,
            color: 'black',
            textAlign: 'left',
          }}
        >
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

              /* For Firefox */
              div {
                scrollbar-width: thin;
                scrollbar-color: gray lightgray;
              }

              /* Hides scrollbar arrows on Firefox */
              div::-webkit-scrollbar-button {
                display: none;
              }
            `}
          </style>
          <h1 style={{ paddingLeft: '20px' }}>Results</h1>
          <ul>
            {/* this isn't working to make it longer? */}
            <li className='restaurant-li'>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <div style={{ flexBasis: '150%', fontSize: 'calc(10px + 0.4vmin)' }}>
                <h3 className='restaurant-li-name'>Chiba Japanese</h3>
                  4.5 stars {getStars(4.5)} $10-20<br />
                  Japanese · 10435 San Diego Mission Rd, San Diego, CA 92108<br />
                  Casual spot for sushi & noodles<br />
                  Open · Closes 9 PM
                </div>
                <div>
                  <img
                    src="https://lh5.googleusercontent.com/p/AF1QipPhRqDxqTti3lsofIQZvPhbS0h5-mb13Vgtguoe=w426-h240-k-no"
                    alt="restaurant" 
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '12px',
                    }}
                  />
                </div>
              </div>
            </li>
            <li className='restaurant-li'>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <div style={{ flexBasis: '250%', fontSize: 'calc(10px + 0.4vmin)' }}>
                {/* not sure why this image got bigger but i had to change the flex basis 150% -> 250% */}
                <h3 className='restaurant-li-name'>Jump Tokyo</h3>
                  4.6 stars {getStars(4.6)} $10-20<br />
                  Sushi · # R, 2311, 10450 Friars Rd, San Diego, CA 92120<br />
                  Unassuming Japanese eatery & sushi bar<br />
                  Open · Closes 9 PM<br />
                  Dine-in · Takeout · No delivery
                </div>
                <div>
                  <img
                    src="https://lh3.googleusercontent.com/proxy/hcDP2ePvORWNmW1mrpD_EX8wKvEi87fAotX6pwUo7UaPC30nSD2v-AyYnm1GjW0rAdbt4dBmAuDsEUdhSRzV-i2-W6KZBOc9GLDEJtnHNKLdDVxcjQRlBMcJ2y25rcsuYq7ZBGuDoJU-JLUL5PIoxbRD66glrcU=s680-w680-h510"
                    alt="restaurant" 
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '12px'
                    }}
                  />
                </div>
              </div>
            </li>
            <li className='restaurant-li'>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <div style={{ flexBasis: '150%', fontSize: 'calc(10px + 0.4vmin)' }}>
                  <h3 className='restaurant-li-name'>Sushi Kuchi</h3>
                  4.3 stars {getStars(4.3)} $20-30<br />
                  Sushi · 2408 Northside Dr, San Diego, CA 92108<br />
                  Casual spot for sushi & teriyaki<br />
                  Open · Closes 9:15<br />
                  Dine-in · Takeout · No delivery
                </div>
                <div>
                  <img
                    src="https://lh5.googleusercontent.com/p/AF1QipN2TnzDFtG1zwBtvsHScMWbVizfexSzfp74syo=w408-h263-k-no"
                    alt="restaurant" 
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '12px'
                    }}
                  />
                </div>
              </div>
            </li>
            <li className='restaurant-li' style={{ borderBottom: '0.1em solid #DADCE0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <div style={{ flexBasis: '150%', fontSize: 'calc(10px + 0.4vmin)' }}>
                <h3 className='restaurant-li-name'>KUMI Sushi Grill</h3>
                  4.5 stars {getStars(4.5)} $10-20<br />
                  Sushi · 4380 Kearny Mesa Rd # 300, San Diego, CA 92111<br />
                  Open · Closes 9:15<br />
                  Dine-in · Takeout · No delivery
                </div>
                <div>
                  <img
                    src="https://lh5.googleusercontent.com/p/AF1QipMUNbqtQXvZcBeLZY0Wvfep7ECo7dahY1l54mr_=w408-h271-k-no"
                    alt="restaurant" 
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '12px'
                    }}
                  />
                </div>
              </div>
            </li>
            {restaurants.map((restaurant) => (
              <li key={restaurant.place_id} className='restaurant-li' onClick={() => handleMarkerClick(restaurant)} onMouseOver={() => handlePreviewMarker(restaurant)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flexBasis: '150%', fontSize: 'calc(10px + 0.4vmin)' }}>
                    <h3 className='restaurant-li-name'>{restaurant.name}</h3>
                    {restaurant.rating} stars {getStars(restaurant.rating)} ${restaurant.minPrice}{restaurant.minPriceLevel}-{restaurant.maxPrice}{restaurant.maxPriceLevel}<br />
                    {restaurant.cuisines} · {restaurant.location}<br />
                    {/* don't know if this works */}
                    {restaurant.getDetails}<br />
                    {/* need to adjust */}
                    Dine-in · Takeout · No delivery
                  </div>
                </div>
                <div>
                  <img
                    src={getPhotoUrl(restaurant.photos)} 
                    alt="restaurant" 
                    style={{
                      width: '20%',
                      height: 'auto',
                    }}
                  />
                </div>
                {/* restaurant address */}
                {/* hours */}
                {/* website */}
                {/* number */}
                {/* order online, check wait time, reserve a table */}
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
          <div>
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
      {/* prices */}
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
          height: '40px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='price-dropdown-btn' onClick={() => {setIsPriceDropdownOpen(!isPriceDropdownOpen); setIsRatingDropdownOpen(false); setIsCravingDropdownOpen(false); setIsAntiCravingDropdownOpen(false); setIsHoursDropdownOpen(false); }}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', alignContent: 'center', gap: '5px' }}>
              {pricesFilter.length === 0 ? <FaRegMoneyBillAlt style={{ fontSize: 20 }} /> : <FaCheck style={{ color: '#1F76E8' }} />}
              {pricesFilter.length === 0 ? "Prices" : <label style={{ fontSize: 15, color: '#1F76E8' }}>{formatPriceDisplay()}</label>}
              {/* want it to be like $-$$$ instead and grab minimum value and maximum value IF CONTINOUS OR DO $$, $$$$ if NON CONTINOUS OPTIONS SELECTED */}
              {pricesFilter.length === 0 ? <FaCaretDown /> : <FaCaretDown style={{ color: '#1F76E8' }} />}
            </label>
          </button>
      </div>
      {isPriceDropdownOpen && (
        <div className='price-dropdown-options'
          style={{
          position: 'absolute',
          top: '70px',
          bottom: '50px',
          left: '24%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '5.75%',
          height: '175px',
          zIndex: 1002,
          color: 'black',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
          textAlign: 'left',
          paddingLeft: '20px',
          paddingTop: '15px',
          fontSize: '16px',
        }}>
          <div class="price-dropdown-content">
            {priceOptions.map((price) => (
              <div key={price} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px'  }}>
                <input
                  type="checkbox"
                  id={price}
                  name={price}
                  value={price}
                  checked={pricesFilter.includes(price)}
                  onChange={() => handlePriceSelection(price)}
                  style={{ height: '18px', width: '18px' }}
                />
                <label htmlFor={price}>{price}</label>
              </div>
            ))}
            <button className='clear-btn' onClick={clearPriceFilter} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
            <button className='done-btn' onClick={donePriceFilter} style={{ color: '#1E76E8', fontWeight: 'bold' }}>Done</button>
          </div>
        </div>
      )}

      {/* rating */}
      <div className='rating-dropdown'
          style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '30.75%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '6%',
          height: '40px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='rating-dropdown-btn' onClick={() => {setIsRatingDropdownOpen(!isRatingDropdownOpen); setIsPriceDropdownOpen(false); setIsCravingDropdownOpen(false); setIsAntiCravingDropdownOpen(false); setIsHoursDropdownOpen(false); }}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {ratingFilter === 0 ? <FaStar /> : <FaCheck style={{ color: '#1F76E8' }} />}
              {ratingFilter === 0 ? "Rating" : <label style={{ color: '#1F76E8' }}> {ratingFilter.toFixed(1)}+ <FaStar style={{ color: 'orange' }}/></label>}
              {ratingFilter === 0 ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#1F76E8' }}></FaCaretDown> }
            </label>
          </button>
      </div>
      {isRatingDropdownOpen && (
          <div className='rating-dropdown-options' style={{
            position: 'absolute',
            zIndex: 1002,
            top: '70px',
            bottom: '50px',
            left: '30.75%',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '0px',
            width: '9.5%',
            height: '295px',
            color: 'black',
            // paddingLeft: '20px',
            paddingRight: '0px',
            boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
            textAlign: 'left',
            // alignContent: 'center',
            // alignItems: 'center',
          }}>
            <div style={{ backgroundColor: 'transparent' }}>
              <button onClick={handleAnyRating} style={{ width: '100%', height: '10px', border: 'none', textAlign: 'left', marginTop: '20px', marginBottom: '15px', paddingLeft: '20px', paddingRight: '20px', backgroundColor: 'transparent' }}>
                <label style={{ fontSize: 15, backgroundColor: 'transparent' }}>Any rating</label>
              </button>
            </div>
            {[2.0, 2.5, 3.0, 3.5, 4.0, 4.5].map((rating) => (
              <div key={rating} style={{ paddingLeft: '20px', backgroundColor: ratingFilter === rating ? '#D2E1FF' : 'transparent', paddingBottom: '10px' }}>
                <button
                  id={`${rating}-stars`}
                  name="rating"
                  value={rating}
                  onClick={() => handleRatingSelection(rating)}
                  style={{
                    width: '100%',
                    height: '10px',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                />
                <label htmlFor={`${rating}-stars`}>
                  {`${rating.toFixed(1)} stars`} {getStars(rating)}
                </label>
              </div>
            ))}
          </div>
        )}

      {/* cravings (cuisines) */}
      {/* Any cuisine, American, Barbecue, Chinese, French, Hamburger, Indian, Italian, Japanese, Mexican, Pizza, Seafood, Steak, Sushi, Thai */}
      <div className='craving-dropdown'
          style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '37.5%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '6.5%',
          height: '40px',
          // overflowX: 'hidden',
          // overflowY: 'hidden',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='craving-dropdown-btn' onClick={() => {setIsCravingDropdownOpen(!isCravingDropdownOpen); setIsPriceDropdownOpen(false); setIsRatingDropdownOpen(false); setIsAntiCravingDropdownOpen(false); setIsHoursDropdownOpen(false); }}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {cravings.length === 0 ? <FaHamburger /> : <FaCheck style={{ color: '#1F76E8' }} />}
              {cravings.length === 0 ? "Cravings" : <label style={{ fontSize: 15, color: '#1F76E8' }}>{cravings.join(', ')}</label>}
              {cravings.length === 0 ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#1F76E8' }}></FaCaretDown> }
            </label>
          </button>
      </div>
      {isCravingDropdownOpen && (
          <div className='craving-dropdown-options' style={{
            position: 'absolute',
            zIndex: 1002,
            top: '70px',
            bottom: '50px',
            left: '37.5%',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '0px',
            width: '8.5%',
            height: '615px',
            color: 'black',
            // paddingLeft: '20px',
            paddingRight: '0px',
            boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
            textAlign: 'left',
            fontSize: 15,
          }}>
            <button onClick={handleAnyCraving} style={{ width: '100%', height: '10px', border: 'none', textAlign: 'left', marginTop: '20px', paddingLeft: '20px', marginBottom: '15px', backgroundColor: 'transparent' }}>
              <label style={{ fontSize: 15 }}>Any cuisine</label>
            </button>
            {["American", "Barbecue", "Chinese", "French", "Hamburger", "Indian", "Italian", "Japanese", "Mexican", "Pizza", "Seafood", "Steak", "Sushi", "Thai"].map((craving) => (
              <div key={craving} style={{ paddingLeft: '20px', backgroundColor: cravings.includes(craving) ? '#D2E1FF' : 'transparent', paddingBottom: '10px' }} >
                <button
                  id={`${craving}`}
                  name="craving"
                  value={craving}
                  onClick={() => handleCravingSelection(craving)}
                  style={{
                    width: '100%',
                    height: '10px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                  }}
                />
                <label htmlFor={`${craving}`} style={{  }}>
                  {`${craving}`}
                </label>
              </div>
            ))}
          </div>
        )}

      {/* anti-cravings (cuisines) */}
      {/* American, Barbecue, Chinese, French, Hamburger, Indian, Italian, Japanese, Mexican, Pizza, Seafood, Steak, Sushi, Thai */}
      <div className='anti-craving-dropdown'
          style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '44.75%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '8%',
          height: '40px',
          // overflowX: 'hidden',
          // overflowY: 'hidden',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='anti-craving-dropdown-btn' onClick={() => {setIsAntiCravingDropdownOpen(!isAntiCravingDropdownOpen); setIsPriceDropdownOpen(false); setIsRatingDropdownOpen(false); setIsCravingDropdownOpen(false); setIsHoursDropdownOpen(false); }}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {antiCravings.length === 0 ? <FaHamburger /> : <FaTimes style={{ color: '#E82720' }} />}
              {antiCravings.length === 0 ? "Anti-Cravings" : <label style={{ fontSize: 15, color: '#E82720' }}>{antiCravings.join(', ')}</label>}
              {antiCravings.length === 0 ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#E82720' }}></FaCaretDown> }
            </label>
          </button>
      </div>
      {isAntiCravingDropdownOpen && (
          <div className='anti-craving-dropdown-options' style={{
            position: 'absolute',
            zIndex: 1002,
            top: '70px',
            bottom: '50px',
            left: '44.75%',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '0px',
            width: '8.5%',
            height: '615px',
            color: 'black',
            // paddingLeft: '20px',
            paddingRight: '0px',
            boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
            textAlign: 'left',
            fontSize: 15,
          }}>
            <button onClick={handleClearAntiCraving} style={{ width: '100%', height: '10px', border: 'none', textAlign: 'left', marginTop: '20px', paddingLeft: '20px', marginBottom: '15px', backgroundColor: 'transparent' }}>
              <label style={{ fontSize: 15 }}>Clear</label>
            </button>
            {["American", "Barbecue", "Chinese", "French", "Hamburger", "Indian", "Italian", "Japanese", "Mexican", "Pizza", "Seafood", "Steak", "Sushi", "Thai"].map((antiCraving) => (
              <div key={antiCraving} style={{ paddingLeft: '20px', backgroundColor: antiCravings.includes(antiCraving) ? '#D2E1FF' : 'transparent', paddingBottom: '10px' }} >
                <button
                  id={`${antiCraving}`}
                  name="antiCraving"
                  value={antiCraving}
                  onClick={() => handleAntiCravingSelection(antiCraving)}
                  style={{
                    width: '100%',
                    height: '10px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'transparent',
                  }}
                />
                <label htmlFor={`${antiCraving}`} style={{  }}>
                  {`${antiCraving}`}
                </label>
              </div>
            ))}
          </div>
        )}

      {/* hours (open/closed) */}
      {/* Any time, Open now, Open 24 hours */}
      <div className='hours-dropdown'
          style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '53.5%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '6%',
          height: '40px',
          // overflowX: 'hidden',
          // overflowY: 'hidden',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='hours-dropdown-btn' onClick={() => {setIsHoursDropdownOpen(!isHoursDropdownOpen); setIsPriceDropdownOpen(false); setIsRatingDropdownOpen(false); setIsCravingDropdownOpen(false); setIsAntiCravingDropdownOpen(false);}}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {hoursFilter === "Any time" ? <FaClock /> : <FaCheck style={{ color: '#1F76E8' }} />}
              {hoursFilter === "Any time" ? "Hours" : <label style={{ fontSize: 15, color: '#1F76E8' }}>{hoursFilter}</label>}
              {hoursFilter === "Any time" ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#1F76E8' }}></FaCaretDown> }
            </label>
          </button>
      </div>
      {isHoursDropdownOpen && (
          <div className='hours-dropdown-options' style={{
            position: 'absolute',
            zIndex: 1002,
            top: '70px',
            bottom: '50px',
            left: '53.5%',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '0px',
            width: '8%',
            height: '135px',
            color: 'black',
            // paddingLeft: '20px',
            paddingRight: '0px',
            boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
            textAlign: 'left',
            fontSize: 16,
            paddingLeft: '20px',
            paddingTop: '15px',
          }}>
            <div class="hours-dropdown-content" style={{ fontSize: '15px' }}>
            {hoursOptions.map((hour) => (
              <div key={hour} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px' }}>
                <input
                  type="radio"
                  id={hour}
                  name={hour}
                  value={hour}
                  checked={hoursFilter.includes(hour)}
                  onChange={() => handleHoursSelection(hour)}
                  style={{ height: '18px', width: '18px' }}
                />
                <label htmlFor={hour}>{hour}</label>
              </div>
            ))}
            {/* <div style={{ display: 'flex', alignItems: 'center', gap: '40px', paddingTop: '8px' }}>
              <button className='clear-btn' onClick={clearHoursFilter} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
              <button className='apply-btn' onClick={applyHoursFilter} style={{ color: '#1E76E8', fontWeight: 'bold' }}>Apply</button>
            </div> */}
            <button className='clear-btn' onClick={clearHoursFilter} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
            <button className='apply-btn' onClick={applyHoursFilter} style={{ color: '#1E76E8', fontWeight: 'bold' }}>Apply</button>
          </div>
        </div>
      )}

      {/* radius (slider) */}
      <div style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '60.25%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '16.5%',
          height: '40px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '10px',
          paddingRight: '10px',
          gap: '10px',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
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
              setRadius(meters);
            }}
            onMouseUp={() => updateCircle(location)}
            style={{ width: '50%' }}
          />
          <label>{(radius / 1609.34).toFixed(1)} miles</label>
      </div>

      {/* all filters */}
      {/* z-index 1001 to go above the restaurant list */}

      {/* re-center */}
      <div style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '78.5%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '5.5%',
          height: '40px',
          overflowX: 'hidden',
          overflowY: 'auto',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='re-center-btn' onClick={handleRecenterClick} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '5px', marginRight: '5px' }}>
            <img src='https://cdn3.iconfinder.com/data/icons/glypho-travel/64/gps-position-target-512.png' alt='re-center-target' width={20}></img> 
            <label>Re-center</label>
          </button>
      </div>
    </div>
    
  );
};

export default MapComponent;