import React, { useEffect, useState, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import { FaSearch, FaMapMarkerAlt, FaWheelchair, FaGlobeEurope, FaPhone, FaCaretDown, FaCheck, FaRegMoneyBillAlt, FaStar, FaStarHalfAlt, FaHamburger, FaTimes, FaClock, FaSlidersH, FaArrowLeft, FaRandom } from 'react-icons/fa';
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
  const [hoursFilter, setHoursFilter] = useState("Any time");

  // whether scrolled or not on menu list
  const [isScrolled, setIsScrolled] = useState(false);

  // dropdown/filter option choices
  const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
  const [isRatingDropdownOpen, setIsRatingDropdownOpen] = useState(false);
  const [isCravingDropdownOpen, setIsCravingDropdownOpen] = useState(false);
  const [isAntiCravingDropdownOpen, setIsAntiCravingDropdownOpen] = useState(false);
  const [isHoursDropdownOpen, setIsHoursDropdownOpen] = useState(false);
  const [isAllFiltersOpen, setIsAllFiltersOpen] = useState(false);
  const [isAllFiltersRatingDropdownOpen, setIsAllFiltersRatingDropdownOpen] = useState(false);

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
        if (filters.type === 'anti-craving') {
          setAntiRestaurants(results);
        }
        
        const filteredRestaurants = results.filter(restaurant =>
          // !antiCravings.includes(restaurant.types.find(type => cravings.includes(type)))
          // !restaurant.types.some(type => antiCravings.includes(type))
          !antiRestaurants.some(anti => anti.place_id === restaurant.place_id)
        );
  
        // Create an array to hold promises for getDetails calls
        const detailsPromises = filteredRestaurants.map((restaurant) => {
          const detailsRequest = {
            placeId: restaurant.place_id,
            fields: [
              'user_ratings_total', // reviews count
              'formatted_phone_number', // phone number
              'opening_hours', // opening hours
              'website', // website link
              // 'wheelchair_accessible_entrance',  // costs EXTRA
              // 'dine_in', // costs EXTRA
              // 'takeout', // costs EXTRA
              // 'delivery', // costs EXTRA
            ]
          };
  
          return new Promise((resolve, reject) => {
            service.getDetails(detailsRequest, (place, detailsStatus) => {
              if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK) {
                // Combine the restaurant data with the details
                const combinedData = { ...restaurant, ...place };
                resolve(combinedData);
              } else {
                reject(detailsStatus);
              }
            });
          });
        });
  
        // Wait for all getDetails calls to complete
        Promise.all(detailsPromises)
          .then(combinedRestaurants => {
            // Filter out restaurants that are in antiRestaurants by comparing place_id
            // const updatedRestaurants = combinedRestaurants.filter(
            //   restaurant => !antiRestaurants.some(anti => anti.place_id === restaurant.place_id)
            // );
            // // Now set the restaurants
            // setRestaurants(updatedRestaurants);
            // Set the combined restaurants data directly
            setRestaurants(combinedRestaurants);
          })
          .catch(error => {
            console.error('Error fetching restaurant details:', error);
          });
      }
    });
  };
  

  useEffect(() => {
    if (map) {      
      // fetchRestaurants({ type: 'craving', cuisines: ['sushi'], openNow: true, rating: 4, minPrice: 1, maxPrice: 4 });
      // fetchRestaurants({ type: 'anti-craving', cuisines: ['pizza'], openNow: true, rating: 4, minPrice: 1, maxPrice: 4 });
      const minPrice = pricesFilter.length === 0 ? 1 : pricesFilter[0];
      fetchRestaurants({ type: 'craving', cuisines: cravings, openNow: {hourFilterOpen}, rating: 4, minPrice: minPrice, maxPrice: pricesFilter[pricesFilter.length - 1] });
      fetchRestaurants({ type: 'anti-craving', cuisines: antiCravings, openNow: {hourFilterOpen}, rating: 4, minPrice: 1, maxPrice: 4 });
      updateLocationMarker(location);
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
    setIsAllFiltersRatingDropdownOpen(false);
  };
  
  const handleRatingSelection = (rating) => {
    setRatingFilter(rating); // Set rating and close dropdown
    setIsRatingDropdownOpen(false);
    setIsAllFiltersRatingDropdownOpen(false);
  };

  const handleCravingSelection = (craving) => {
    if (cravings.includes(craving)) {
      setCravings(cravings.filter(c => c !== craving)); // Deselect craving
    } else {
      setCravings([...cravings, craving]); // Select craving
    }
  }

  const handleAnyCraving = () => {
    setCravings([]);
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
    setAntiCravings([]);
    setIsAntiCravingDropdownOpen(false);
  }

  const handleHoursSelection = (hour) => {
    setHoursFilter(hour);
  }

  const hourFilterOpen = () => {
    if (hoursFilter === "Any time") {
      return true;
    }
    return false;
  }

  const clearHoursFilter = () => {
    setHoursFilter("Any time");
  }

  const applyHoursFilter = () => {
    setIsHoursDropdownOpen(false);
  }

  const handleAllFiltersClick = () => {
    setIsAllFiltersOpen(true);
    setIsPriceDropdownOpen(false);
    setIsRatingDropdownOpen(false);
    setIsCravingDropdownOpen(false);
    setIsAntiCravingDropdownOpen(false);
    setIsHoursDropdownOpen(false);
    setIsScrolled(false);
  }

  const clearAllFilters = () => {
    setPricesFilter([]);
    setRatingFilter(0);
    setCravings([]);
    setAntiCravings([]);
    setHoursFilter("Any time");
    setRadius(4828);
    setIsScrolled(false);
  }

  const doneAllFilters = () => {
    setIsAllFiltersOpen(false);
    setIsScrolled(false);
  }
  
  const handleRandomRestaurant = () => {
    setSelectedRestaurant(restaurants[Math.floor(Math.random() * restaurants.length)]);
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
            <Marker
              label={{
                className: 'marker-label',
                text: restaurant.name,
                fontSize: 'calc(5px + 0.9vmin)',
                fontWeight: 'bold',
                color: (selectedRestaurant === restaurant || previewRestaurant === restaurant) ? 'red' : 'black',
              }}
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
                labelOrigin: new window.google.maps.Point(15, -10),
              }}
            />
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
            paddingRight: '10px',
            height: '92%',
            width: '22.5%',
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
            {restaurants.map((restaurant) => (
              <li key={restaurant.place_id} className='restaurant-li' onClick={() => handleMarkerClick(restaurant)} onMouseOver={() => handlePreviewMarker(restaurant)}>
                <div className='restaurant-card' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className='restaurant-details' style={{ flexBasis: '150%', fontSize: 'calc(10px + 0.4vmin)' }}>
                    <h3 className='restaurant-li-name' style={{ marginTop: '10px' }}>{restaurant.name}</h3>
                    {restaurant.rating} stars {getStars(restaurant.rating)} ({restaurant.user_ratings_total}) {restaurant.price_level ? `· ${'$'.repeat(restaurant.price_level)}` : ''}<br />
                    {/* {restaurant.wheelchair_accessible_entrance && (
                    <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>
                      <FaWheelchair style={{ color: '#1B6EF3' }} /> · 
                    </p>
                    )} */}
                    {restaurant.vicinity}<br />
                    <span style={{ color: restaurant.opening_hours.open_now ? 'green' : 'red' }}>
                      {restaurant.opening_hours.open_now ? 'Open' : 'Closed'}
                    </span><br />
                    {/* {restaurant.dine_in ? 'Dine-in · ' : ''}
                    {restaurant.takeout ? 'Takeout · ' : ''}
                    {restaurant.delivery ? 'Delivery' : ''}<br /> */}
                  </div>
                  <div className='restaurant-image'>
                    <img
                      src={getPhotoUrl(restaurant.photos)} 
                      alt="restaurant" 
                      style={{
                        width: '150px',
                        height: '100px',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        borderRadius: '12px',
                        marginTop: '20px'
                      }}
                    />
                  </div>
                </div>
                {restaurant.website ? 
                  <div style={{ marginTop: '10px', borderRadius: '15px', border: '0.1em solid #1B6EF3', width: '100%', height: '30px', alignContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1B6EF3', paddingLeft: '5px', paddingRight: '5px' }}>Website</a><br /> 
                  </div>
                  : <br />
                }
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
                  height: '250px',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                }}
              />
            )}
            <h3 style={{ display: 'flex', textAlign: 'left', marginLeft: '40px' }}>{selectedRestaurant.name}</h3>
            <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>{selectedRestaurant.rating} stars {getStars(selectedRestaurant.rating)} ({selectedRestaurant.user_ratings_total}) {selectedRestaurant.price_level ? `· ${'$'.repeat(selectedRestaurant.price_level)}` : ''}</p>
            {/* {selectedRestaurant.wheelchair_accessible_entrance && (
              <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>
                <FaWheelchair style={{ color: '#1B6EF3' }} /> · 
              </p>
            )}
            {selectedRestaurant.dine_in && (
              <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>
                <FaCheck style={{ color: 'green' }}/>Dine-in
              </p>
            )}
            {selectedRestaurant.takeout && (
              <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>
                <FaCheck style={{ color: 'green' }}/>Takeout
              </p>
            )}
            {selectedRestaurant.delivery && (
              <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>
                <FaCheck style={{ color: 'green' }}/>Delivery
              </p>
            )} */}
            <p style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', marginLeft: '40px' }}>
              <FaMapMarkerAlt style={{ color: '#1B6EF3' }} />{selectedRestaurant.vicinity}
            </p>
            <span style={{ color: selectedRestaurant.opening_hours.open_now ? 'green' : 'red', display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', textAlign: 'left', marginLeft: '40px' }}>
              <FaClock style={{ color: '#1B6EF3' }} />
              {selectedRestaurant.opening_hours.open_now ? 'Open' : 'Closed'}
            </span>
            {selectedRestaurant.opening_hours.weekday_text ? (
              <div style={{ textAlign: 'left', marginLeft: '68px'}}>
                <ul>
                  {selectedRestaurant.opening_hours.weekday_text.map((day, index) => (
                    <li key={index}>{day}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Hours not available</p>
            )}
            {selectedRestaurant.website ? 
              <div>
                <div style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', textAlign: 'left', marginLeft: '40px', color: 'black' }}>
                  <FaGlobeEurope style={{ color: '#1B6EF3', flexShrink: 0 }} /><a href={selectedRestaurant.website} target="_blank" rel="noopener noreferrer" style={{ color: '#1B6EF3', maxWidth: '300px', whiteSpace: 'normal', wordWrap: 'break-word' }}>{selectedRestaurant.website}</a><br /> 
                </div><br />
              </div>
              : ''
            }
            {selectedRestaurant.formatted_phone_number ?
              <div style={{ display: 'flex', gap: '10px', alignContent: 'center', alignItems: 'center', textAlign: 'center', marginLeft: '40px', marginBottom: '20px' }}>
                <FaPhone style={{ color: '#1B6EF3' }} />{selectedRestaurant.formatted_phone_number}<br />
              </div>
            : <br />
            }
          </div>
        </div>
      )}

      {/* Filters Overlay View */}
      {/* prices */}
      {!isAllFiltersOpen && (
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
              {pricesFilter.length === 0 ? <FaCaretDown /> : <FaCaretDown style={{ color: '#1F76E8' }} />}
            </label>
          </button>
        </div>
      )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'right', gap: '8px', paddingTop: '8px', paddingRight: '10px' }}>
              <button className='clear-btn' onClick={clearPriceFilter} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
              <button className='done-btn' onClick={donePriceFilter} style={{ color: '#1E76E8', fontWeight: 'bold' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* rating */}
      {!isAllFiltersOpen && (
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
      )}
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
            paddingRight: '0px',
            boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
            textAlign: 'left',
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
      {!isAllFiltersOpen && (
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
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='craving-dropdown-btn' onClick={() => {setIsCravingDropdownOpen(!isCravingDropdownOpen); setIsPriceDropdownOpen(false); setIsRatingDropdownOpen(false); setIsAntiCravingDropdownOpen(false); setIsHoursDropdownOpen(false); }}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {cravings.length === 0 ? <FaHamburger /> : <FaCheck style={{ color: '#1F76E8', flexShrink: 0 }} />}
              {cravings.length === 0 ? "Cravings" : <label style={{ fontSize: 15, color: '#1F76E8' }}>{cravings.join(', ')}</label>}
              {cravings.length === 0 ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#1F76E8', flexShrink: 0 }}></FaCaretDown> }
            </label>
          </button>
        </div>
      )}
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
      {!isAllFiltersOpen && (
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
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='anti-craving-dropdown-btn' onClick={() => {setIsAntiCravingDropdownOpen(!isAntiCravingDropdownOpen); setIsPriceDropdownOpen(false); setIsRatingDropdownOpen(false); setIsCravingDropdownOpen(false); setIsHoursDropdownOpen(false); }}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {antiCravings.length === 0 ? <FaHamburger /> : <FaTimes style={{ color: '#E82720', flexShrink: 0 }} />}
              {antiCravings.length === 0 ? "Anti-Cravings" : <label style={{ fontSize: 15, color: '#E82720' }}>{antiCravings.join(', ')}</label>}
              {antiCravings.length === 0 ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#E82720', flexShrink: 0 }}></FaCaretDown> }
            </label>
          </button>
        </div>
      )}
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
      {!isAllFiltersOpen && (
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
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'right', gap: '5px' }}>
              {hoursFilter === "Any time" ? <FaClock /> : <FaCheck style={{ color: '#1F76E8' }} />}
              {hoursFilter === "Any time" ? "Hours" : <label style={{ fontSize: 15, color: '#1F76E8' }}>{hoursFilter}</label>}
              {hoursFilter === "Any time" ? <FaCaretDown ></FaCaretDown> : <FaCaretDown style={{ color: '#1F76E8' }}></FaCaretDown> }
            </label>
          </button>
        </div>
      )}
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
            {/* {hoursOptions.map((hour) => ( */}
            {["Any time", "Open now"].map((hour) => (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'right', gap: '8px', paddingTop: '8px', paddingRight: '10px' }}>
              <button className='clear-btn' onClick={clearHoursFilter} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
              <button className='apply-btn' onClick={applyHoursFilter} style={{ color: '#1E76E8', fontWeight: 'bold' }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* radius (slider) */}
      {!isAllFiltersOpen && (
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
      )}

      {/* all filters */}
      {!isAllFiltersOpen && (
        <div className='all-filters'
          style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '78.5%',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0px',
          width: '6%',
          height: '40px',
          zIndex: 1000,
          color: 'black',
          alignContent: 'center',
          boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
        }}>
          <button className='all-filters-btn' onClick={() => {handleAllFiltersClick()}}>
            <label style={{ fontSize: 15, display: 'flex', alignItems: 'right', gap: '5px' }}>
              <FaSlidersH />
              All Filters
            </label>
          </button>
        </div>
      )}
      {isAllFiltersOpen && (
        <div className='all-filters-options' style={{ zIndex: 1005 }}>
          <div style={{ position: 'absolute', top: '0px', paddingLeft: '10px', zIndex: 1005, width: '23%', height: '8.5%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: "white", boxShadow: isScrolled ? '0 4px 2px -2px rgba(0, 0, 0, 0.3)' : 'none', borderBottom: '0.1em solid #DADCE0' }}>
              <FaArrowLeft onClick={() => setIsAllFiltersOpen(false)} style={{ fontSize: 24 }}/>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'right', gap: '8px', paddingTop: '8px', paddingRight: '10px' }}>
                <button className='clear-btn' onClick={clearAllFilters} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
                <button className='done-btn' onClick={doneAllFilters} style={{ color: '#1E76E8', fontWeight: 'bold' }}>Done</button>
              </div>
          </div>
          <div onScroll={handleScroll}
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
              backgroundColor: 'white',
              paddingLeft: '30px',
              paddingRight: '30px',
              height: '92%',
              width: '20.4%',
              overflowY: 'auto',
              zIndex: 1003,
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
            <div className='all-filters-option' style={{ paddingTop: '10px' }}>
              <h3>Price</h3>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {priceOptions.map((price) => (
                  <div
                    key={price}
                    onClick={() => handlePriceSelection(price)}
                    style={{
                      padding: '10px 10px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      backgroundColor: pricesFilter.includes(price) ? '#1E76E8' : 'white',
                      color: pricesFilter.includes(price) ? 'white' : '#202124',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      textAlign: 'center',
                      flex: '1',  // Ensures all boxes are equal width
                    }}
                  >
                    {price}
                  </div>
                ))}
              </div>
            </div>

            <div className='all-filters-option'>
              <h3>Rating at least</h3>
              <div>
                <button className='all-filters-rating-dropdown-btn' style={{ border: '0.1em solid #ccc', borderRadius: '2px', height: '38px', paddingLeft: '15px', paddingRight: '15px' }} onClick={() => {setIsAllFiltersRatingDropdownOpen(!isAllFiltersRatingDropdownOpen); }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 15 }}>
                    {ratingFilter === 0 ? "Any rating": <label>{ratingFilter.toFixed(1)} {getStars(ratingFilter)}</label>}
                    <FaCaretDown />
                  </label>
                </button>
                {isAllFiltersRatingDropdownOpen && (
                  <div className='all-filters-rating-dropdown-options' style={{
                    position: 'absolute',
                    zIndex: 1002,
                    top: '160px',
                    bottom: '50px',
                    left: '5%',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '0px',
                    width: '40%',
                    height: '295px',
                    color: 'black',
                    paddingRight: '0px',
                    boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
                    textAlign: 'left',
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
              </div>
            </div>

            <div className='all-filters-option'>
              <h3>Hours</h3>
              <div class="all-filters-hours-option-content" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', fontSize: '15px' }}>
              {/* {hoursOptions.map((hour) => ( */}
              {["Any time", "Open now"].map((hour) => (
                <div key={hour} style={{ flex: '1' }}>
                  <div
                    key={hour}
                    onClick={() => handleHoursSelection(hour)}
                    style={{
                      padding: '10px 10px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      backgroundColor: hoursFilter === hour ? '#1E76E8' : 'white',
                      color: hoursFilter === hour ? 'white' : '#202124',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      textAlign: 'center',
                    }}
                  >
                    {hour}
                  </div>
                </div>
              ))}
              </div>
            </div>

            <div className='all-filters-option'>
              <h3>Distance</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                  style={{ width: '75%' }}
                />
                <label>{(radius / 1609.34).toFixed(1)} miles</label>
              </div>
            </div>

            <div className='all-filters-option'>
              <div style={{ display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'space-between' }}>
                <h3>Cravings</h3>
                <button className='clear-btn' onClick={handleAnyCraving} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
              </div>
              <div style={{ alignContent: 'center', alignItems: 'center', fontSize: 15 }}>
                {["American", "Barbecue", "Chinese", "French", "Hamburger", "Indian", "Italian", "Japanese", "Mexican", "Pizza", "Seafood", "Steak", "Sushi", "Thai"].map((craving) => (
                  <div key={craving} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '5px', paddingBottom: '5px' }} >
                    <input
                    type="checkbox"
                    id={craving}
                    name={craving}
                    value={craving}
                    checked={cravings.includes(craving)}
                    onChange={() => handleCravingSelection(craving)}
                    style={{ height: '18px', width: '18px' }}
                  />
                    <label htmlFor={`${craving}`} style={{  }}>
                      {`${craving}`}
                    </label>
                  </div>
                ))}
              </div> 
            </div>

            <div className='all-filters-option'>
              <div style={{ display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'space-between' }}>
                <h3>Anti-Cravings</h3>
                <button className='clear-btn' onClick={handleClearAntiCraving} style={{ color: '#202124', fontWeight: 'bold' }}>Clear</button>
              </div>
              <div style={{ alignContent: 'center', alignItems: 'center', fontSize: 15 }}>
                {["American", "Barbecue", "Chinese", "French", "Hamburger", "Indian", "Italian", "Japanese", "Mexican", "Pizza", "Seafood", "Steak", "Sushi", "Thai"].map((antiCraving) => (
                  <div key={antiCraving} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '5px', paddingBottom: '5px' }} >
                    <input
                    type="checkbox"
                    id={antiCraving}
                    name={antiCraving}
                    value={antiCraving}
                    checked={antiCravings.includes(antiCraving)}
                    onChange={() => handleAntiCravingSelection(antiCraving)}
                    style={{ height: '18px', width: '18px' }}
                  />
                    <label htmlFor={`${antiCraving}`} style={{  }}>
                      {`${antiCraving}`}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* re-center */}
      {!isAllFiltersOpen && (
        <div style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '85.25%',
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
      )}

      {/* random */}
      {!isAllFiltersOpen && (
        <div style={{
          position: 'absolute',
          top: '10px',
          bottom: '50px',
          left: '91.5%',
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
          <button className='random-btn' onClick={handleRandomRestaurant} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '5px', marginRight: '5px' }}>
            <FaRandom />
            <label>Random</label>
          </button>
      </div>
      )}
    </div>
  );
};

export default MapComponent;