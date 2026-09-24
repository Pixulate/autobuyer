export const buyer = {
  name: "Marcus Reid",
  status: "Serious Buyer",
  location: "Los Angeles, CA",
  interestCount: 3,
  unlocks: 23,
  rating: 4.9,
  bio: "Relocating with family and hunting for reliable, low-km SUVs. Cash-ready, flexible on color, prefer dealer-maintained history. Open to trade-ins.",
  avatar:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces",
};

export const generalPreferences = [
  { id: "body", label: "SUV / Crossover", icon: "car-sport-outline" as const, color: "#3B82F6" },
  { id: "budget", label: "$28K – $55K", icon: "cash-outline" as const, color: "#22C55E" },
  { id: "miles", label: "Under 120K km", icon: "speedometer-outline" as const, color: "#A855F7" },
  { id: "area", label: "LA & Nearby", icon: "location-outline" as const, color: "#EF4444" },
];

export const vehicleInterests = [
  {
    id: "x5",
    title: "BMW X5",
    meta: "2020-2022 • SUV",
    tags: ["Dealer Maintained", "Any Color"],
    colors: ["#3B82F6", "#1E40AF"] as const,
  },
  {
    id: "model3",
    title: "Tesla Model 3",
    meta: "2021-2024 • Sedan",
    tags: ["Low kms", "White / Black"],
    colors: ["#14B8A6", "#0F766E"] as const,
  },
  {
    id: "rx",
    title: "Lexus RX",
    meta: "2019-2023 • SUV",
    tags: ["Certified Pre-Owned", "AWD"],
    colors: ["#F59E0B", "#C2410C"] as const,
  },
];

export const recentActivity = [
  {
    id: "msg",
    icon: "chatbubble-ellipses" as const,
    iconBg: "#E8F1FF",
    iconColor: "#3B82F6",
    title: "Coastal Auto Group sent you a message",
    subtitle: "BMW X5 • 12m ago",
    unread: true,
  },
  {
    id: "views",
    icon: "eye" as const,
    iconBg: "#F3E8FF",
    iconColor: "#A855F7",
    title: "3 sellers viewed your profile",
    subtitle: "Today • 9:40 AM",
    unread: false,
  },
  {
    id: "unlock",
    icon: "lock-open" as const,
    iconBg: "#E7F8EF",
    iconColor: "#22C55E",
    title: "Westside Motors unlocked your interest",
    subtitle: "Tesla Model 3 • Yesterday",
    unread: false,
  },
  {
    id: "rating",
    icon: "star" as const,
    iconBg: "#FEF6E6",
    iconColor: "#F59E0B",
    title: "You received a new rating",
    subtitle: "2 days ago",
    unread: false,
  },
];

export const homeMatches = [
  {
    id: "coastal",
    dealer: "Coastal Auto Group",
    vehicle: "2021 BMW X5 xDrive40i",
    detail: "66K km • $46,900 • 13 km away",
    status: "New message",
  },
  {
    id: "westside",
    dealer: "Westside Motors",
    vehicle: "2022 Tesla Model 3 Long Range",
    detail: "29K km • $34,200 • 19 km away",
    status: "Interest unlocked",
  },
  {
    id: "pacific",
    dealer: "Pacific BMW",
    vehicle: "2020 BMW X5 sDrive40i",
    detail: "84K km • $41,500 • 10 km away",
    status: "Viewed your profile",
  },
];

export const conversations = [
  {
    id: "c1",
    dealer: "Coastal Auto Group",
    preview: "We have a 2021 X5 with full dealer history — want to see photos?",
    time: "12m",
    unread: true,
  },
  {
    id: "c2",
    dealer: "Westside Motors",
    preview: "Thanks for the interest. This Model 3 is still available.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "c3",
    dealer: "Pacific BMW",
    preview: "Happy to set up a private showing this weekend.",
    time: "Mon",
    unread: false,
  },
];
