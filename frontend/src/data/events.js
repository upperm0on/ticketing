const events = [
  {
    id: "evt-101",
    title: "Sunset Jazz Nights",
    dateTime: "Fri, Aug 16, 2024 · 7:30 PM",
    venue: "Harbor Park Amphitheater",
    price: "$35",
    status: "Available",
    ticketTypes: [
      { id: "tt-101-a", name: "Regular", price: 35, limit: 120, soldCount: 45 },
      { id: "tt-101-b", name: "VIP", price: 75, limit: 40, soldCount: 18 },
    ],
    description:
      "An open-air jazz showcase featuring local ensembles, food stalls, and a sunset skyline view.",
    flyerUrl: "https://via.placeholder.com/640x360?text=Event+Flyer",
  },
  {
    id: "evt-102",
    title: "Tech & Tea Meetup",
    dateTime: "Sat, Aug 24, 2024 · 2:00 PM",
    venue: "Civic Innovation Hub",
    price: "$10",
    status: "Available",
    ticketTypes: [
      { id: "tt-102-a", name: "Regular", price: 10, limit: 80, soldCount: 20 },
      { id: "tt-102-b", name: "VIP", price: 25, limit: 25, soldCount: 10 },
    ],
    description:
      "A casual afternoon of lightning talks, product demos, and networking over tea and pastries.",
    flyerUrl: "https://via.placeholder.com/640x360?text=Event+Flyer",
  },
  {
    id: "evt-103",
    title: "City Lights Film Festival",
    dateTime: "Sat, Sep 7, 2024 · 6:00 PM",
    venue: "Riverside Cinema Hall",
    price: "$50",
    status: "Sold Out",
    ticketTypes: [
      { id: "tt-103-a", name: "Regular", price: 50, limit: 150, soldCount: 150 },
      { id: "tt-103-b", name: "VIP", price: 95, limit: 30, soldCount: 30 },
    ],
    description:
      "Celebrate indie cinema with premieres, director Q&A sessions, and curated short films.",
    flyerUrl: "https://via.placeholder.com/640x360?text=Event+Flyer",
  },
  {
    id: "evt-104",
    title: "Community Art Fair",
    dateTime: "Sun, Sep 15, 2024 · 11:00 AM",
    venue: "Old Town Plaza",
    price: "Free",
    status: "Available",
    ticketTypes: [
      { id: "tt-104-a", name: "General Entry", price: 0, limit: 300, soldCount: 120 },
      { id: "tt-104-b", name: "Patron", price: 15, limit: 50, soldCount: 12 },
    ],
    description:
      "A family-friendly art market featuring local creators, live demos, and workshop stations.",
    flyerUrl: "https://via.placeholder.com/640x360?text=Event+Flyer",
  },
];

export default events;
