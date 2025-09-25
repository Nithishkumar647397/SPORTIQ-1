// js/districts.js
// Simple State → Districts dataset for SportIQ (demo)
// Exposes a global `statesAndDistricts`

var statesAndDistricts = {
  "Andhra Pradesh": [
    "Anantapur",
    "Chittoor",
    "East Godavari",
    "Guntur",
    "Krishna",
  ],
  Assam: [
    "Dibrugarh",
    "Guwahati (Kamrup Metro)",
    "Jorhat",
    "Nagaon",
    "Silchar",
  ],
  Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia"],
  Delhi: [
    "Central Delhi",
    "East Delhi",
    "New Delhi",
    "North Delhi",
    "South Delhi",
    "West Delhi",
  ],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Karnal", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Kullu", "Kangra", "Mandi", "Solan"],
  "Jammu and Kashmir": [
    "Jammu",
    "Srinagar",
    "Anantnag",
    "Baramulla",
    "Udhampur",
  ],
  Jharkhand: [
    "Ranchi",
    "Dhanbad",
    "Jamshedpur (East Singhbhum)",
    "Hazaribagh",
    "Bokaro",
  ],
  Karnataka: [
    "Bengaluru Urban",
    "Mysuru",
    "Mangaluru (Dakshina Kannada)",
    "Belagavi",
    "Dharwad",
    "Shivamogga",
  ],
  Kerala: [
    "Thiruvananthapuram",
    "Kollam",
    "Ernakulam",
    "Thrissur",
    "Kozhikode",
    "Kannur",
  ],
  "Madhya Pradesh": [
    "Bhopal",
    "Indore",
    "Gwalior",
    "Jabalpur",
    "Ujjain",
    "Sagar",
  ],
  Maharashtra: [
    "Mumbai Suburban",
    "Mumbai City",
    "Pune",
    "Nagpur",
    "Nashik",
    "Aurangabad",
  ],
  Odisha: [
    "Bhubaneswar (Khordha)",
    "Cuttack",
    "Puri",
    "Sambalpur",
    "Rourkela (Sundargarh)",
  ],
  Punjab: [
    "Amritsar",
    "Jalandhar",
    "Ludhiana",
    "Patiala",
    "SAS Nagar (Mohali)",
  ],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Tirunelveli",
    "Vellore",
  ],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar"],
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur Nagar",
    "Varanasi",
    "Prayagraj",
    "Ghaziabad",
    "Agra",
  ],
  Uttarakhand: [
    "Dehradun",
    "Haridwar",
    "Nainital",
    "Rudraprayag",
    "Udham Singh Nagar",
  ],
  "West Bengal": [
    "Kolkata",
    "Howrah",
    "Darjeeling",
    "Siliguri (Darjeeling)",
    "Nadia",
    "North 24 Parganas",
  ],
};

// Ensure availability on window for module scripts
window.statesAndDistricts = statesAndDistricts;
// Debug confirm
try {
  console.debug(
    "statesAndDistricts loaded:",
    Object.keys(statesAndDistricts).length,
    "states"
  );
} catch {}
