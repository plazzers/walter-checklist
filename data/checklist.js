// Walter's Home Check — checklist data.
// Generated from CHECKLIST_CONTENT.md. You can edit the text here directly,
// or edit CHECKLIST_CONTENT.md and rebuild this file (see README).
// Keep the quotes and commas exactly as they are.

export const AREAS = [
  {
    "id": "a1",
    "num": 1,
    "name": "Outside & Grounds",
    "icon": "tree",
    "items": [
      {
        "id": "a1-01",
        "text": "Ground slopes away from the house on all sides",
        "tip": "Water should run away from your foundation, not toward it. Stand at each corner and look. If the dirt slopes toward the house, that's how basements get wet.",
        "priority": "High",
        "pro": "Landscaper / grading contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-02",
        "text": "No standing water or soggy spots near the foundation",
        "tip": "A puddle that sits next to the house after rain is water looking for a way in.",
        "priority": "Medium",
        "pro": "Landscaper / drainage contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-03",
        "text": "Gutters are attached, clean and not sagging",
        "tip": "Clogged gutters overflow right where you don't want water — against the foundation.",
        "priority": "Medium",
        "pro": "Gutter contractor",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a1-04",
        "text": "Downspouts send water at least 4–6 feet away from the house",
        "tip": "A downspout dumping water at the foundation undoes everything the gutters are doing. A cheap extension fixes a lot.",
        "priority": "Medium",
        "pro": "Gutter contractor",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a1-05",
        "text": "Trees and large shrubs are not touching the roof or walls",
        "tip": "Branches scrape shingles, drop leaves in gutters and give critters a free bridge to your roof.",
        "priority": "Low",
        "pro": "Tree service",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-06",
        "text": "Large trees are not too close to the foundation",
        "tip": "Big roots near the house can mess with foundations and sewer lines. Note how close the biggest trees are.",
        "priority": "Medium",
        "pro": "Arborist / sewer contractor",
        "modes": ["B"]
      },
      {
        "id": "a1-07",
        "text": "Driveway and walkways have no major cracks or trip hazards",
        "tip": "Small cracks are normal. Big heaved slabs are a trip hazard and sometimes a sign of drainage trouble.",
        "priority": "Low",
        "pro": "Concrete contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-08",
        "text": "Retaining walls are straight, not leaning or bulging",
        "tip": "A leaning retaining wall is losing the fight with the dirt behind it. Those get expensive.",
        "priority": "High",
        "pro": "Structural engineer",
        "modes": ["B"]
      },
      {
        "id": "a1-09",
        "text": "Decks and porches feel solid, no soft or rotten boards",
        "tip": "Push on posts and step on boards near the house. Soft wood means rot.",
        "priority": "High",
        "pro": "Deck contractor / carpenter",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-10",
        "text": "Deck is attached to the house with metal hardware, not just nails",
        "tip": "Decks that pull away from the house are a real safety issue. Look underneath where the deck meets the wall.",
        "priority": "High",
        "pro": "Deck contractor",
        "modes": ["B"]
      },
      {
        "id": "a1-11",
        "text": "Railings on steps, porches and decks are solid",
        "tip": "Grab every railing and give it a good shake. It should not move.",
        "priority": "High",
        "pro": "Carpenter",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-12",
        "text": "Outside faucets work and don't leak",
        "tip": "Turn each one on and off. Check for drips inside the wall behind it too, if you can see it.",
        "priority": "Low",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a1-13",
        "text": "Outside faucets shut off / drained for winter",
        "tip": "A frozen outdoor faucet can split the pipe inside the wall, and you won't know until spring. Disconnect hoses.",
        "priority": "High",
        "pro": "Plumber",
        "modes": ["W"]
      }
    ]
  },
  {
    "id": "a2",
    "num": 2,
    "name": "Roof",
    "icon": "house-roof",
    "items": [
      {
        "id": "a2-01",
        "text": "Shingles lie flat — no curling, cupping or missing pieces",
        "tip": "Look from the ground with binoculars if you need to. Never climb a roof you're not comfortable on.",
        "priority": "High",
        "pro": "Roofer",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a2-02",
        "text": "No bare spots or heavy granule loss on shingles",
        "tip": "Lots of granules in the gutters or at downspout exits means the shingles are wearing out.",
        "priority": "Medium",
        "pro": "Roofer",
        "modes": ["B", "A"]
      },
      {
        "id": "a2-03",
        "text": "Roof age is known (ask the seller or check records)",
        "tip": "Asphalt shingle roofs often last about 20–25 years. Knowing the age tells you what's coming.",
        "priority": "Medium",
        "pro": "Roofer",
        "modes": ["B"]
      },
      {
        "id": "a2-04",
        "text": "Roof line looks straight — no sagging",
        "tip": "A dip in the roof line can mean problems with the structure underneath.",
        "priority": "High",
        "pro": "Structural engineer / roofer",
        "modes": ["B"]
      },
      {
        "id": "a2-05",
        "text": "Flashing around chimney, vents and skylights looks sealed",
        "tip": "Most roof leaks I'd look for start at flashing, not in the middle of the shingles.",
        "priority": "Medium",
        "pro": "Roofer",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a2-06",
        "text": "Chimney is straight, bricks and mortar in good shape",
        "tip": "Loose bricks or crumbling mortar on a chimney let water in and can become a falling hazard.",
        "priority": "Medium",
        "pro": "Chimney / masonry contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a2-07",
        "text": "Chimney has a cap",
        "tip": "A cap keeps rain, animals and debris out of the flue.",
        "priority": "Low",
        "pro": "Chimney sweep",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a2-08",
        "text": "No moss or heavy debris sitting on the roof",
        "tip": "Moss holds water against shingles and shortens their life.",
        "priority": "Low",
        "pro": "Roofer / roof cleaning",
        "modes": ["A", "W"]
      }
    ]
  },
  {
    "id": "a3",
    "num": 3,
    "name": "Outside Walls, Windows & Doors",
    "icon": "window",
    "items": [
      {
        "id": "a3-01",
        "text": "Siding has no cracks, holes, gaps or rot",
        "tip": "Pay attention to the bottom edge and around windows — that's where rot starts.",
        "priority": "Medium",
        "pro": "Siding contractor / carpenter",
        "modes": ["B", "A"]
      },
      {
        "id": "a3-02",
        "text": "Paint or caulk is not peeling, cracked or missing",
        "tip": "Paint and caulk are what keep water out of the wood. When they go, the wood is next.",
        "priority": "Low",
        "pro": "Painter",
        "modes": ["B", "A"]
      },
      {
        "id": "a3-03",
        "text": "Brick or stone walls have no large cracks",
        "tip": "Stair-step cracks in brick or cracks wider than a coin edge deserve a closer look.",
        "priority": "High",
        "pro": "Structural engineer / mason",
        "modes": ["B"]
      },
      {
        "id": "a3-04",
        "text": "Windows open, close and lock properly",
        "tip": "Test a few in every room. Painted-shut windows are a problem in a fire.",
        "priority": "Medium",
        "pro": "Window contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a3-05",
        "text": "No fogging or moisture between double-pane glass",
        "tip": "Fog between the panes means the seal failed. Not an emergency, but the insulation value is gone.",
        "priority": "Low",
        "pro": "Window contractor",
        "modes": ["B"]
      },
      {
        "id": "a3-06",
        "text": "Window frames and sills are not soft or rotten",
        "tip": "Press gently with your thumb or a key on the bottom corners.",
        "priority": "Medium",
        "pro": "Carpenter",
        "modes": ["B", "A"]
      },
      {
        "id": "a3-07",
        "text": "Doors open, close and latch without sticking",
        "tip": "A door that suddenly sticks can be humidity — or the house shifting. Note it.",
        "priority": "Low",
        "pro": "Carpenter",
        "modes": ["B"]
      },
      {
        "id": "a3-08",
        "text": "Weatherstripping around doors and windows is intact",
        "tip": "If you can see daylight around a closed door, you're heating the outdoors.",
        "priority": "Low",
        "pro": "Handyman",
        "modes": ["A", "W"]
      }
    ]
  },
  {
    "id": "a4",
    "num": 4,
    "name": "Foundation & Structure",
    "icon": "brick",
    "items": [
      {
        "id": "a4-01",
        "text": "No horizontal cracks in foundation walls",
        "tip": "Horizontal cracks are the ones I'd worry about most. They can mean soil pushing on the wall.",
        "priority": "High",
        "pro": "Structural engineer",
        "modes": ["B", "A"]
      },
      {
        "id": "a4-02",
        "text": "Vertical cracks are hairline only (thinner than a credit card)",
        "tip": "Thin vertical cracks are common as concrete cures. Wide ones, or ones with one side sticking out, are a different story.",
        "priority": "Medium",
        "pro": "Structural engineer",
        "modes": ["B", "A"]
      },
      {
        "id": "a4-03",
        "text": "No foundation walls bowing or leaning inward",
        "tip": "Look down the length of the wall. It should be straight.",
        "priority": "High",
        "pro": "Structural engineer",
        "modes": ["B"]
      },
      {
        "id": "a4-04",
        "text": "No stair-step cracks in block or brick foundation",
        "tip": "Cracks that zig-zag along the mortar joints can mean settling.",
        "priority": "High",
        "pro": "Structural engineer",
        "modes": ["B"]
      },
      {
        "id": "a4-05",
        "text": "Floors inside feel level — no noticeable slopes or bounce",
        "tip": "Put a marble or a ball on the floor in a few rooms. A little roll is an old house. A fast roll is a question.",
        "priority": "Medium",
        "pro": "Structural engineer",
        "modes": ["B"]
      },
      {
        "id": "a4-06",
        "text": "No cracks above door frames or windows inside",
        "tip": "Diagonal cracks running from the corners of doors and windows can be a sign of movement.",
        "priority": "Medium",
        "pro": "Structural engineer",
        "modes": ["B"]
      },
      {
        "id": "a4-07",
        "text": "No signs of wood damage from insects (tunnels, sawdust, soft wood)",
        "tip": "Termite mud tubes on the foundation look like thin dirt tunnels. Don't ignore them.",
        "priority": "High",
        "pro": "Pest control / termite inspector",
        "modes": ["B", "A"]
      }
    ]
  },
  {
    "id": "a5",
    "num": 5,
    "name": "Basement & Crawlspace",
    "icon": "stairs-down",
    "items": [
      {
        "id": "a5-01",
        "text": "No water stains, puddles or damp spots on floor or walls",
        "tip": "Check corners and where the floor meets the wall. Water lines on boxes or walls tell old stories.",
        "priority": "High",
        "pro": "Waterproofing contractor",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a5-02",
        "text": "No white chalky deposits on walls (efflorescence)",
        "tip": "That white powder is minerals left behind by water coming through the wall.",
        "priority": "Medium",
        "pro": "Waterproofing contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a5-03",
        "text": "No musty smell or visible mold",
        "tip": "Your nose is one of the best inspection tools. Musty means moisture somewhere.",
        "priority": "High",
        "pro": "Mold remediation / waterproofing",
        "modes": ["B", "A"]
      },
      {
        "id": "a5-04",
        "text": "Sump pump works (if there is one)",
        "tip": "Pour a bucket of water in the pit and make sure the pump kicks on and pumps it out.",
        "priority": "High",
        "pro": "Plumber",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a5-05",
        "text": "Sump pump discharge goes well away from the house",
        "tip": "No sense pumping the water out just to have it run right back in.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a5-06",
        "text": "Crawlspace has a vapor barrier and is dry",
        "tip": "Look with a flashlight from the access door. Standing water or bare wet dirt is a problem.",
        "priority": "Medium",
        "pro": "Crawlspace contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a5-07",
        "text": "Beams, joists and posts are solid — no rot, cracks or sagging",
        "tip": "Poke suspicious wood with a screwdriver. It should not sink in.",
        "priority": "High",
        "pro": "Structural engineer / carpenter",
        "modes": ["B"]
      },
      {
        "id": "a5-08",
        "text": "No signs of rodents (droppings, chewed insulation)",
        "tip": "Mice in the basement are rarely only in the basement.",
        "priority": "Low",
        "pro": "Pest control",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a5-09",
        "text": "Radon test done (or planned)",
        "tip": "Radon is a gas you can't see or smell, and it's common in basements. Test kits are cheap. Testing is the only way to know.",
        "priority": "High",
        "pro": "Radon mitigation specialist",
        "modes": ["B", "A"]
      }
    ]
  },
  {
    "id": "a6",
    "num": 6,
    "name": "Attic & Insulation",
    "icon": "triangle-house",
    "items": [
      {
        "id": "a6-01",
        "text": "Insulation covers the attic floor evenly",
        "tip": "Gaps and thin spots mean heat escapes. Compare a few spots with a ruler.",
        "priority": "Medium",
        "pro": "Insulation contractor",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a6-02",
        "text": "No water stains on roof boards or rafters",
        "tip": "Dark stains on the underside of the roof deck mean a leak, now or in the past. Look after a rain if you can.",
        "priority": "High",
        "pro": "Roofer",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a6-03",
        "text": "No daylight coming through the roof boards",
        "tip": "Turn off your flashlight. Daylight where it shouldn't be is a hole.",
        "priority": "High",
        "pro": "Roofer",
        "modes": ["B", "A"]
      },
      {
        "id": "a6-04",
        "text": "Attic vents are open and not blocked by insulation",
        "tip": "An attic needs to breathe. Blocked vents trap moisture and heat.",
        "priority": "Medium",
        "pro": "Roofer / insulation contractor",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a6-05",
        "text": "Bathroom and kitchen fans vent outside, not into the attic",
        "tip": "Fans dumping moist air into the attic can rot the roof from the inside.",
        "priority": "Medium",
        "pro": "Electrician / roofer",
        "modes": ["B"]
      },
      {
        "id": "a6-06",
        "text": "No signs of animals (nests, droppings)",
        "tip": "Squirrels, raccoons and birds love attics. They chew wires too.",
        "priority": "Medium",
        "pro": "Wildlife removal",
        "modes": ["B", "A"]
      },
      {
        "id": "a6-07",
        "text": "No frost or heavy condensation on roof boards in cold weather",
        "tip": "Frost in the attic means warm, wet air from the house is getting up there.",
        "priority": "Medium",
        "pro": "Insulation contractor",
        "modes": ["W"]
      },
      {
        "id": "a6-08",
        "text": "Old fluffy gray-brown or vermiculite insulation noted (do not disturb)",
        "tip": "Some older loose insulation can contain asbestos. Don't touch it — get it tested.",
        "priority": "High",
        "pro": "Asbestos testing professional",
        "modes": ["B"]
      }
    ]
  },
  {
    "id": "a7",
    "num": 7,
    "name": "Electrical",
    "icon": "lightning",
    "items": [
      {
        "id": "a7-01",
        "text": "Main panel has a clear label for each breaker",
        "tip": "A labeled panel saves a lot of guessing in an emergency.",
        "priority": "Low",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a7-02",
        "text": "No scorch marks, burning smell or buzzing at the panel",
        "tip": "Don't open the panel cover yourself. Just look and smell. Any of these means call an electrician now.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a7-03",
        "text": "Panel brand noted (ask about Federal Pacific or Zinsco panels)",
        "tip": "Some older panel brands have a bad reputation for breakers not tripping. Worth asking an electrician about.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B"]
      },
      {
        "id": "a7-04",
        "text": "Electrical service size known (amps)",
        "tip": "Older homes may have small service that struggles with modern use. Ask the seller or an electrician.",
        "priority": "Medium",
        "pro": "Electrician",
        "modes": ["B"]
      },
      {
        "id": "a7-05",
        "text": "Outlets near water have GFCI protection (kitchen, baths, garage, outside, laundry)",
        "tip": "Those outlets with test and reset buttons protect you from shock near water. Press test, then reset.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a7-06",
        "text": "Outlets are not loose, cracked or warm to the touch",
        "tip": "A warm outlet or switch plate is not normal.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a7-07",
        "text": "Three-prong outlets are actually grounded",
        "tip": "A cheap plug-in outlet tester tells you in seconds.",
        "priority": "Medium",
        "pro": "Electrician",
        "modes": ["B"]
      },
      {
        "id": "a7-08",
        "text": "No exposed wiring, open junction boxes or extension cords used as permanent wiring",
        "tip": "Wires should be in walls or boxes, not hanging loose.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a7-09",
        "text": "No signs of very old wiring (cloth-covered, knob-and-tube)",
        "tip": "Very old wiring may not be safe or insurable. Look in the basement and attic.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B"]
      },
      {
        "id": "a7-10",
        "text": "Lights work and don't flicker when appliances turn on",
        "tip": "Flickering when the fridge or AC kicks on can mean a loose connection.",
        "priority": "Medium",
        "pro": "Electrician",
        "modes": ["B", "A"]
      }
    ]
  },
  {
    "id": "a8",
    "num": 8,
    "name": "Plumbing",
    "icon": "water-drop",
    "items": [
      {
        "id": "a8-01",
        "text": "Water pressure is good at faucets and showers",
        "tip": "Turn on a sink and a shower at the same time. A weak trickle is worth asking about.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a8-02",
        "text": "No leaks under sinks",
        "tip": "Open every cabinet with a flashlight. Feel the bottom of the cabinet for soft or warped wood.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a8-03",
        "text": "Drains empty quickly, no gurgling",
        "tip": "Fill a sink and let it go. Slow or gurgling drains can mean clogs or venting problems.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a8-04",
        "text": "Toilets flush well, don't run and don't rock",
        "tip": "Sit on it and lean side to side. A rocking toilet can leak at the base and rot the floor.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a8-05",
        "text": "Type of water pipes noted (copper, PEX, galvanized, polybutylene)",
        "tip": "Some older pipe types, like gray polybutylene or old galvanized steel, have a history of problems.",
        "priority": "High",
        "pro": "Plumber",
        "modes": ["B"]
      },
      {
        "id": "a8-06",
        "text": "Main water shut-off located and it works",
        "tip": "Find it before you need it. In a burst-pipe emergency, every minute counts.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a8-07",
        "text": "Exposed pipes in unheated areas are insulated",
        "tip": "Pipes in crawlspaces, garages and outside walls are the ones that freeze.",
        "priority": "High",
        "pro": "Plumber",
        "modes": ["W"]
      },
      {
        "id": "a8-08",
        "text": "Sewer line camera inspection considered (older home or big trees)",
        "tip": "A sewer line replacement is one of the most expensive surprises. A camera inspection is cheap insurance.",
        "priority": "High",
        "pro": "Plumber / sewer contractor",
        "modes": ["B"]
      },
      {
        "id": "a8-09",
        "text": "Well and septic inspected (if the home has them)",
        "tip": "Wells and septic systems need their own inspection. Don't skip it.",
        "priority": "High",
        "pro": "Well & septic specialist",
        "modes": ["B"]
      }
    ]
  },
  {
    "id": "a9",
    "num": 9,
    "name": "Water Heater",
    "icon": "tank",
    "items": [
      {
        "id": "a9-01",
        "text": "Age of the water heater is known (check the label)",
        "tip": "Tank water heaters often last around 8–12 years. The date is usually on the label or in the serial number.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a9-02",
        "text": "No rust, corrosion or water around the base",
        "tip": "Rust at the bottom of the tank is usually the beginning of the end.",
        "priority": "High",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a9-03",
        "text": "Relief valve has a pipe running down toward the floor",
        "tip": "That valve and pipe are a safety device. The pipe should point down, not at someone's face.",
        "priority": "High",
        "pro": "Plumber",
        "modes": ["B"]
      },
      {
        "id": "a9-04",
        "text": "Gas water heater vent pipe is connected and sloped up",
        "tip": "A loose vent can let exhaust gases into the house.",
        "priority": "High",
        "pro": "Plumber / HVAC technician",
        "modes": ["B", "A"]
      },
      {
        "id": "a9-05",
        "text": "Water heater is strapped (in earthquake areas)",
        "tip": "Many areas require straps so the tank can't tip over.",
        "priority": "Low",
        "pro": "Plumber",
        "modes": ["B"]
      }
    ]
  },
  {
    "id": "a10",
    "num": 10,
    "name": "Heating & Cooling",
    "icon": "thermometer",
    "items": [
      {
        "id": "a10-01",
        "text": "Heating system turns on and heats every room",
        "tip": "Turn the thermostat up and walk through the house. Every room should warm up.",
        "priority": "High",
        "pro": "HVAC technician",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a10-02",
        "text": "Air conditioning turns on and cools (warm weather only)",
        "tip": "Don't run the AC when it's cold outside — you can damage it.",
        "priority": "Medium",
        "pro": "HVAC technician",
        "modes": ["B", "A"]
      },
      {
        "id": "a10-03",
        "text": "Age of furnace/boiler and AC unit is known",
        "tip": "Ask the seller or look at the labels. Older equipment means a replacement may be coming.",
        "priority": "Medium",
        "pro": "HVAC technician",
        "modes": ["B"]
      },
      {
        "id": "a10-04",
        "text": "Filter is clean",
        "tip": "A dirty filter makes the system work harder. Easy fix, often ignored.",
        "priority": "Low",
        "pro": "Homeowner / HVAC technician",
        "modes": ["A", "W"]
      },
      {
        "id": "a10-05",
        "text": "System has been serviced in the last year",
        "tip": "A yearly tune-up catches small problems before the coldest night of the year.",
        "priority": "Medium",
        "pro": "HVAC technician",
        "modes": ["A", "W"]
      },
      {
        "id": "a10-06",
        "text": "No rust, soot or burning smell around the furnace",
        "tip": "Soot or a burning smell around a gas furnace means call a technician — don't wait.",
        "priority": "High",
        "pro": "HVAC technician",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a10-07",
        "text": "Outdoor AC unit is level and clear of plants and debris",
        "tip": "Give it at least two feet of breathing room.",
        "priority": "Low",
        "pro": "HVAC technician",
        "modes": ["A"]
      },
      {
        "id": "a10-08",
        "text": "Fireplace and chimney were cleaned/inspected recently",
        "tip": "Creosote buildup in a chimney is a fire risk.",
        "priority": "High",
        "pro": "Chimney sweep",
        "modes": ["B", "A", "W"]
      }
    ]
  },
  {
    "id": "a11",
    "num": 11,
    "name": "Kitchen",
    "icon": "pot",
    "items": [
      {
        "id": "a11-01",
        "text": "Appliances turn on and work",
        "tip": "Run the stove burners, oven, dishwasher and garbage disposal.",
        "priority": "Low",
        "pro": "Appliance repair",
        "modes": ["B"]
      },
      {
        "id": "a11-02",
        "text": "No leaks under the sink or behind the dishwasher",
        "tip": "Look and feel. Swollen cabinet floors are a giveaway.",
        "priority": "Medium",
        "pro": "Plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a11-03",
        "text": "Range hood works and vents outside if possible",
        "tip": "A hood that just blows air back into the room is better than nothing, but not by much.",
        "priority": "Low",
        "pro": "Electrician / HVAC technician",
        "modes": ["B"]
      },
      {
        "id": "a11-04",
        "text": "Outlets by the counter are GFCI protected",
        "tip": "Press test and reset on each one.",
        "priority": "High",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a11-05",
        "text": "Cabinets and drawers open, close and are attached solidly",
        "tip": "Loose upper cabinets are a hazard.",
        "priority": "Low",
        "pro": "Carpenter",
        "modes": ["B"]
      }
    ]
  },
  {
    "id": "a12",
    "num": 12,
    "name": "Bathrooms",
    "icon": "bath",
    "items": [
      {
        "id": "a12-01",
        "text": "Floor is solid around the toilet and tub (no soft spots)",
        "tip": "Press down with your foot. Soft floor near a toilet means a slow leak has been going on.",
        "priority": "High",
        "pro": "Plumber / carpenter",
        "modes": ["B", "A"]
      },
      {
        "id": "a12-02",
        "text": "Caulk and grout around tub and shower are intact",
        "tip": "Cracked caulk lets water behind the tile, where you can't see it.",
        "priority": "Medium",
        "pro": "Handyman / tile contractor",
        "modes": ["B", "A"]
      },
      {
        "id": "a12-03",
        "text": "Tiles are not loose or cracked",
        "tip": "Tap gently. Hollow sounding tiles can mean water damage behind them.",
        "priority": "Medium",
        "pro": "Tile contractor",
        "modes": ["B"]
      },
      {
        "id": "a12-04",
        "text": "Exhaust fan works and actually pulls air",
        "tip": "Hold a piece of toilet paper up to it. It should stick.",
        "priority": "Medium",
        "pro": "Electrician",
        "modes": ["B", "A"]
      },
      {
        "id": "a12-05",
        "text": "No mold on ceiling or walls",
        "tip": "Small spots on a bathroom ceiling usually mean poor ventilation.",
        "priority": "Medium",
        "pro": "Handyman / mold remediation",
        "modes": ["B", "A"]
      },
      {
        "id": "a12-06",
        "text": "Hot water arrives in a reasonable time",
        "tip": "Waiting forever for hot water is mostly annoying — but note it.",
        "priority": "Low",
        "pro": "Plumber",
        "modes": ["B"]
      }
    ]
  },
  {
    "id": "a13",
    "num": 13,
    "name": "Inside Rooms",
    "icon": "door",
    "items": [
      {
        "id": "a13-01",
        "text": "No water stains on ceilings",
        "tip": "Stains under bathrooms or near outside walls usually point straight at the source.",
        "priority": "High",
        "pro": "Roofer / plumber",
        "modes": ["B", "A"]
      },
      {
        "id": "a13-02",
        "text": "No large cracks in walls or ceilings",
        "tip": "Hairline cracks are common. Wide or growing cracks are worth asking about.",
        "priority": "Medium",
        "pro": "Structural engineer",
        "modes": ["B"]
      },
      {
        "id": "a13-03",
        "text": "Floors have no soft spots, buckling or major damage",
        "tip": "Buckled wood floors often mean water.",
        "priority": "Medium",
        "pro": "Flooring contractor",
        "modes": ["B"]
      },
      {
        "id": "a13-04",
        "text": "Stairs are solid with secure handrails",
        "tip": "Every staircase should have a handrail you can grip.",
        "priority": "High",
        "pro": "Carpenter",
        "modes": ["B", "A"]
      },
      {
        "id": "a13-05",
        "text": "Older home (built before 1978): painted surfaces noted for possible lead paint",
        "tip": "Peeling paint in older homes can contain lead, which is dangerous especially for kids. Get it tested before sanding.",
        "priority": "High",
        "pro": "Lead paint inspector",
        "modes": ["B"]
      },
      {
        "id": "a13-06",
        "text": "Older home (built before 1980s): possible asbestos materials noted (do not disturb)",
        "tip": "Some old floor tiles, pipe wrap and popcorn ceilings can contain asbestos. Test before any renovation.",
        "priority": "High",
        "pro": "Asbestos testing professional",
        "modes": ["B"]
      }
    ]
  },
  {
    "id": "a14",
    "num": 14,
    "name": "Safety",
    "icon": "shield",
    "items": [
      {
        "id": "a14-01",
        "text": "Smoke alarms in every bedroom, outside sleeping areas and on every level",
        "tip": "Press the test button on every one. They don't last forever — most should be replaced about every 10 years.",
        "priority": "High",
        "pro": "Homeowner / electrician",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a14-02",
        "text": "Carbon monoxide alarms near sleeping areas (if gas appliances or attached garage)",
        "tip": "Carbon monoxide has no smell. An alarm is the only warning you get.",
        "priority": "High",
        "pro": "Homeowner / electrician",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a14-03",
        "text": "Fire extinguisher in the kitchen",
        "tip": "Check the gauge is in the green.",
        "priority": "Medium",
        "pro": "Homeowner",
        "modes": ["A", "W"]
      },
      {
        "id": "a14-04",
        "text": "Dryer vent is clean and vents outside",
        "tip": "Lint buildup in dryer vents causes house fires. Clean it once a year.",
        "priority": "High",
        "pro": "Dryer vent cleaning",
        "modes": ["B", "A", "W"]
      },
      {
        "id": "a14-05",
        "text": "Bedroom windows can be opened as an escape route",
        "tip": "Every bedroom needs a way out besides the door.",
        "priority": "High",
        "pro": "Window contractor",
        "modes": ["B"]
      },
      {
        "id": "a14-06",
        "text": "Gas smell anywhere? (should be none)",
        "tip": "If you smell gas, leave the house and call the gas company from outside. Don't flip switches.",
        "priority": "High",
        "pro": "Gas utility company",
        "modes": ["B", "A", "W"]
      }
    ]
  },
  {
    "id": "a15",
    "num": 15,
    "name": "Garage",
    "icon": "car",
    "items": [
      {
        "id": "a15-01",
        "text": "Garage door reverses when it hits something",
        "tip": "Put a roll of paper towels under the door and close it. It should stop and go back up.",
        "priority": "High",
        "pro": "Garage door technician",
        "modes": ["B", "A"]
      },
      {
        "id": "a15-02",
        "text": "Door between garage and house closes on its own and is solid",
        "tip": "That door is there to slow down a fire and keep car fumes out.",
        "priority": "Medium",
        "pro": "Carpenter",
        "modes": ["B"]
      },
      {
        "id": "a15-03",
        "text": "No cracks or water in the garage floor beyond normal wear",
        "tip": "Small cracks are normal. Big heaving or water coming in is not.",
        "priority": "Low",
        "pro": "Concrete contractor",
        "modes": ["B"]
      },
      {
        "id": "a15-04",
        "text": "Garage outlets are GFCI protected",
        "tip": "Press test and reset.",
        "priority": "Medium",
        "pro": "Electrician",
        "modes": ["B", "A"]
      }
    ]
  }
];

export const SELLER_QUESTIONS = [
  "How old is the roof, and has it ever leaked?",
  "Has the basement or crawlspace ever had water in it?",
  "How old are the furnace, AC and water heater? Do you have service records?",
  "Have there been any repairs to the foundation or structure?",
  "Have there been any insurance claims on the house?",
  "Has the house been tested for radon? What was the result?",
  "Any problems with the sewer line, septic or well?",
  "What renovations were done, and were permits pulled?",
  "Any pest problems, past or present (termites, mice, other)?",
  "What are the average monthly utility bills?",
  "Is there anything you know about the house that I should know?"
];
