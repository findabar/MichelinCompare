import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const restaurants = [
  // France - Paris
  {
    name: "L'Ambroisie",
    city: "Paris",
    country: "France",
    cuisineType: "French",
    michelinStars: 3,
    yearAwarded: 1988,
    address: "9 Place des Vosges, 75004 Paris, France",
    latitude: 48.8555,
    longitude: 2.3656,
    description: "A temple of classic French cuisine in the heart of Place des Vosges",
  },
  {
    name: "Le Bernardin",
    city: "New York",
    country: "USA",
    cuisineType: "Seafood",
    michelinStars: 3,
    yearAwarded: 2005,
    address: "155 W 51st St, New York, NY 10019, USA",
    latitude: 40.7614,
    longitude: -73.9776,
    description: "Exceptional seafood restaurant by Eric Ripert",
  },
  {
    name: "Eleven Madison Park",
    city: "New York",
    country: "USA",
    cuisineType: "Contemporary American",
    michelinStars: 3,
    yearAwarded: 2012,
    address: "11 Madison Ave, New York, NY 10010, USA",
    latitude: 40.7420,
    longitude: -73.9870,
    description: "Plant-based fine dining experience",
  },
  // Japan - Tokyo
  {
    name: "Sukiyabashi Jiro",
    city: "Tokyo",
    country: "Japan",
    cuisineType: "Sushi",
    michelinStars: 3,
    yearAwarded: 2007,
    address: "Tsukamoto Sogyo Building, Basement 1F, 4-2-15 Ginza, Chuo City, Tokyo 104-0061, Japan",
    latitude: 35.6719,
    longitude: 139.7648,
    description: "World-renowned sushi restaurant by Jiro Ono",
  },
  {
    name: "Narisawa",
    city: "Tokyo",
    country: "Japan",
    cuisineType: "Contemporary Japanese",
    michelinStars: 2,
    yearAwarded: 2007,
    address: "2-6-15 Kagurazaka, Shinjuku City, Tokyo 162-0825, Japan",
    latitude: 35.7025,
    longitude: 139.7408,
    description: "Innovative Japanese cuisine with nature-inspired presentations",
  },
  // Spain - Barcelona
  {
    name: "Disfrutar",
    city: "Barcelona",
    country: "Spain",
    cuisineType: "Contemporary",
    michelinStars: 2,
    yearAwarded: 2018,
    address: "Carrer de Villarroel, 163, 08036 Barcelona, Spain",
    latitude: 41.3851,
    longitude: 2.1734,
    description: "Creative Mediterranean cuisine",
  },
  // UK - London
  {
    name: "Restaurant Gordon Ramsay",
    city: "London",
    country: "UK",
    cuisineType: "French",
    michelinStars: 3,
    yearAwarded: 2001,
    address: "68 Royal Hospital Rd, Chelsea, London SW3 4HP, UK",
    latitude: 51.4873,
    longitude: -0.1592,
    description: "Gordon Ramsay's flagship restaurant",
  },
  {
    name: "The Ledbury",
    city: "London",
    country: "UK",
    cuisineType: "Contemporary European",
    michelinStars: 2,
    yearAwarded: 2010,
    address: "127 Ledbury Rd, Notting Hill, London W11 2AQ, UK",
    latitude: 51.5139,
    longitude: -0.2058,
    description: "Elegant contemporary European cuisine",
  },
  // Italy - Rome
  {
    name: "La Pergola",
    city: "Rome",
    country: "Italy",
    cuisineType: "Italian",
    michelinStars: 3,
    yearAwarded: 2005,
    address: "Via Alberto Cadlolo, 101, 00136 Roma RM, Italy",
    latitude: 41.9194,
    longitude: 12.4542,
    description: "Rome's only three-star Michelin restaurant",
  },
  // Germany - Berlin
  {
    name: "Tim Raue",
    city: "Berlin",
    country: "Germany",
    cuisineType: "Asian Fusion",
    michelinStars: 2,
    yearAwarded: 2012,
    address: "Rudi-Dutschke-Straße 26, 10969 Berlin, Germany",
    latitude: 52.5066,
    longitude: 13.3897,
    description: "Asian-inspired cuisine with German precision",
  },
  // Denmark - Copenhagen
  {
    name: "Noma",
    city: "Copenhagen",
    country: "Denmark",
    cuisineType: "Nordic",
    michelinStars: 2,
    yearAwarded: 2007,
    address: "Refshalevej 96, 1432 Copenhagen, Denmark",
    latitude: 55.7005,
    longitude: 12.6089,
    description: "Revolutionary Nordic cuisine",
  },
  // Hong Kong
  {
    name: "8 1/2 Otto e Mezzo Bombana",
    city: "Hong Kong",
    country: "Hong Kong",
    cuisineType: "Italian",
    michelinStars: 3,
    yearAwarded: 2012,
    address: "Shop 202, Landmark Alexandra, 18 Chater Rd, Central, Hong Kong",
    latitude: 22.2819,
    longitude: 114.1572,
    description: "Authentic Italian cuisine in Hong Kong",
  },
  // Singapore
  {
    name: "Odette",
    city: "Singapore",
    country: "Singapore",
    cuisineType: "Contemporary French",
    michelinStars: 3,
    yearAwarded: 2019,
    address: "1 St Andrew's Rd, #01-04 National Gallery Singapore, Singapore 178957",
    latitude: 1.2903,
    longitude: 103.8519,
    description: "Modern French cuisine in an art gallery setting",
  },
  // More 1-star restaurants for variety
  {
    name: "Le Comptoir du Relais",
    city: "Paris",
    country: "France",
    cuisineType: "Bistro",
    michelinStars: 1,
    yearAwarded: 2015,
    address: "9 Carrefour de l'Odéon, 75006 Paris, France",
    latitude: 48.8506,
    longitude: 2.3391,
    description: "Classic Parisian bistro",
  },
  {
    name: "Gramercy Tavern",
    city: "New York",
    country: "USA",
    cuisineType: "American",
    michelinStars: 1,
    yearAwarded: 2006,
    address: "42 E 20th St, New York, NY 10003, USA",
    latitude: 40.7380,
    longitude: -73.9877,
    description: "Seasonal American cuisine",
  },
  {
    name: "Kikunoi",
    city: "Kyoto",
    country: "Japan",
    cuisineType: "Kaiseki",
    michelinStars: 3,
    yearAwarded: 2009,
    address: "459 Shimokawara-chō, Higashiyama Ward, Kyoto, 605-0825, Japan",
    latitude: 34.9988,
    longitude: 135.7804,
    description: "Traditional kaiseki restaurant with over 400 years of history",
  },
  {
    name: "Osteria Francescana",
    city: "Modena",
    country: "Italy",
    cuisineType: "Italian",
    michelinStars: 3,
    yearAwarded: 2012,
    address: "Via Stella, 22, 41121 Modena MO, Italy",
    latitude: 44.6468,
    longitude: 10.9254,
    description: "Massimo Bottura's innovative take on Italian cuisine",
  },
  {
    name: "Atelier Crenn",
    city: "San Francisco",
    country: "USA",
    cuisineType: "Contemporary French",
    michelinStars: 3,
    yearAwarded: 2018,
    address: "3127 Fillmore St, San Francisco, CA 94123, USA",
    latitude: 37.7989,
    longitude: -122.4338,
    description: "Dominique Crenn's poetic cuisine",
  },
  {
    name: "Alain Ducasse au Plaza Athénée",
    city: "Paris",
    country: "France",
    cuisineType: "French",
    michelinStars: 3,
    yearAwarded: 2016,
    address: "25 Av. Montaigne, 75008 Paris, France",
    latitude: 48.8661,
    longitude: 2.3045,
    description: "Naturalness cuisine by Alain Ducasse",
  },
  {
    name: "Ultraviolet by Paul Pairet",
    city: "Shanghai",
    country: "China",
    cuisineType: "Contemporary",
    michelinStars: 3,
    yearAwarded: 2021,
    address: "Shanghai, China (location revealed upon booking)",
    latitude: 31.2304,
    longitude: 121.4737,
    description: "Multi-sensory dining experience",
  },
  {
    name: "Central",
    city: "Lima",
    country: "Peru",
    cuisineType: "Peruvian",
    michelinStars: 1,
    yearAwarded: 2023,
    address: "Av. Pedro de Osma 301, Barranco 15063, Peru",
    latitude: -12.1442,
    longitude: -77.0206,
    description: "Virgilio Martínez's exploration of Peruvian biodiversity",
  },
];

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  await prisma.userVisit.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  // Seed restaurants
  for (const restaurant of restaurants) {
    await prisma.restaurant.create({
      data: restaurant,
    });
  }

  console.log(`Seeded ${restaurants.length} restaurants`);

  // Create a sample user for testing
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 12);

  await prisma.user.create({
    data: {
      username: 'demo_user',
      email: 'demo@example.com',
      passwordHash,
    },
  });

  console.log('Created demo user (email: demo@example.com, password: password123)');
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });