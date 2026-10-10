import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
story_path = ROOT / "content/narrative/story.json"
prod_path = ROOT / "content/narrative/story-production.json"
app_path = ROOT / "apps/story-studio/src/app.js"
build_path = ROOT / "apps/story-studio/build.mjs"

story = json.loads(story_path.read_text())
prod = json.loads(prod_path.read_text())

saga = next(s for s in story["sagas"] if s["id"] == "S01")
ch02 = next(c for c in saga["chapters"] if c["id"] == "CH02")
ch03 = next(c for c in saga["chapters"] if c["id"] == "CH03")


def node(chapter, node_id):
    return next(n for n in chapter["nodes"] if n["id"] == node_id)


def ev(event_id, typ, text, speaker=None, label=None):
    value = {"id": event_id, "type": typ, "text": text}
    if speaker is not None:
        value["speaker"] = speaker
        value["displayLabel"] = label or speaker
    return value


def beat(beat_id, order, title, presentation, characters, screen, intent, control, trigger, result, nxt, script):
    return {
        "id": beat_id,
        "order": order,
        "title": title,
        "presentation": presentation,
        "characters": characters,
        "screenAction": screen,
        "dialogueIntent": intent,
        "playerControl": control,
        "trigger": trigger,
        "result": result,
        "next": nxt,
        "scriptStatus": "draft",
        "script": script,
    }


# --- CH02 free-order reputation cluster ---
ch02["status"] = "draft"
ch02["routeClusters"] = [
    {
        "id": "CH02-REP-01",
        "title": "Proof Before Rank",
        "mode": "complete-any",
        "requiredCount": 2,
        "nodeIds": ["CH02-B00", "CH02-B00B", "CH02-B00C"],
        "reconvergesAt": "CH02-N02A",
        "optionalAfterThreshold": True,
        "summary": "Three small local siege incidents are available in free order. Completing any two gives MC's party enough independent witnesses for Dunois to recognize them as useful irregulars; the third remains optional before the route reconverges.",
    }
]

n02 = node(ch02, "CH02-N02")
n02["summary"] = "Jeanne enters Orléans as a distant public symbol. MC sees the city's hope gather around a tired young woman, then returns to ordinary siege work. Three local missions become available; any two may be completed in any order before higher command pays real attention."
n02["beats"] = [
    beat(
        "CH02-N02-BEAT-01", 1, "The Maid in the Crowd", "cinematic",
        ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Jeanne d’Arc", "Civilians"],
        "Crowds gather around Jeanne's entry. MC catches only fragments of her through banners and people and never reaches her.",
        "Keep Jeanne distant, human, and burdened by public hope. No private protagonist access yet.",
        "dialogue advance", "maid_arrival",
        "MC understands why the Maid rumor mattered, but Jeanne remains someone seen from the crowd.",
        "CH02-N02-BEAT-02",
        [
            ev("S01-CH02-N02-L010", "action", "A wave of shouting rolls down the street before MC can see its cause."),
            ev("S01-CH02-N02-L020", "dialogue", "What happened?", "MC", "MC"),
            ev("S01-CH02-N02-L030", "dialogue", "She made it into the city.", "Civilian", "Civilian"),
            ev("S01-CH02-N02-L040", "action", "A white banner rises above the crowd. Beneath it rides a young armored woman, visibly tired and trying to acknowledge everyone at once."),
            ev("S01-CH02-N02-L050", "dialogue", "They look at her like the siege is already over.", "Julie d’Aubigny", "Julie"),
            ev("S01-CH02-N02-L060", "dialogue", "That is a dangerous amount of hope to put on one person.", "Hangaku Gozen", "Hangaku Gozen"),
        ],
    ),
    beat(
        "CH02-N02-BEAT-02", 2, "Back to Ordinary Work", "story-scene",
        ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Quartermaster"],
        "The crowd disperses and MC's group is sent back to the unglamorous work of a besieged city. Three unrelated local problems are posted at once.",
        "Turn the chapter from spectacle back to earned credibility. The party chooses where to help first rather than being summoned upward.",
        "mission selection / dialogue advance", "maid_entry_ends",
        "The three free-order reputation missions unlock. Any two are sufficient to continue; the third remains optional.",
        "CH02-REP-01",
        [
            ev("S01-CH02-N02-L070", "action", "The crowd closes. Jeanne disappears from view before MC gets anywhere near her."),
            ev("S01-CH02-N02-L080", "action", "By the time MC reaches the quartermaster yard again, nobody there cares about banners. Three different problems are waiting."),
            ev("S01-CH02-N02-L090", "dialogue", "Couriers cut off east of the gate. A supply run under pressure. And an outer watch that stopped answering.", "Quartermaster", "Quartermaster"),
            ev("S01-CH02-N02-L100", "dialogue", "Which one first?", "MC", "MC"),
            ev("S01-CH02-N02-L110", "dialogue", "Whichever keeps people alive. We can argue about the rest after.", "Julie d’Aubigny", "Julie"),
            ev("S01-CH02-N02-L120", "control", "Reputation missions unlocked: complete any 2 of 3 in any order. The remaining mission is optional after the threshold is reached."),
        ],
    ),
]

b00 = node(ch02, "CH02-B00")
b00["summary"] = "Free-order reputation mission 1/3. Returning couriers and wounded soldiers are cut off on an outer approach. MC's group must reach them, cover the withdrawal, and return the dispatches. This is a Fantasia local siege incident, not a claimed historical battle."
b00["beats"] = [
    beat("CH02-B00-BEAT-01", 1, "Find the Cut-Off Party", "battle-preview",
         ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Orléans Couriers", "English screen troops"],
         "The obvious road is watched. MC identifies a lower farm track and guides the group toward the stranded couriers.",
         "First achievement should show judgment and initiative, not protagonist-level battlefield command.",
         "battle control", "mission_CH02-B00_selected",
         "The party reaches the stranded couriers before the English screen closes around them.", "CH02-B00-BEAT-02",
         [ev("S01-CH02-B00-L010", "control", "Objective: reach the stranded party and secure the dispatch carrier."),
          ev("S01-CH02-B00-L020", "action", "The obvious road is watched. MC spots a lower farm track partly hidden by hedges and broken walls."),
          ev("S01-CH02-B00-L030", "dialogue", "That way is ugly, but it is not covered.", "MC", "MC"),
          ev("S01-CH02-B00-L040", "dialogue", "Ugly is useful. Move.", "Hangaku Gozen", "Hangaku Gozen")]),
    beat("CH02-B00-BEAT-02", 2, "Hold the Return Lane", "battle-event",
         ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Orléans Couriers", "English screen troops"],
         "English screen troops close from the main road while the wounded are moved. The party must hold a narrow return lane instead of chasing a victory.",
         "Make protection and discipline the achievement. The mission succeeds because people and dispatches escape.",
         "battle control", "couriers_reached",
         "The wounded and dispatch carrier start moving while MC's group holds the pursuit back.", "CH02-B00-BEAT-03",
         [ev("S01-CH02-B00-L050", "action", "The group reaches the couriers as English screen troops begin closing from the main road."),
          ev("S01-CH02-B00-L060", "dialogue", "Take the wounded first. We hold until they are moving.", "Julie d’Aubigny", "Julie"),
          ev("S01-CH02-B00-L070", "control", "Objective update: cover the withdrawal and keep the dispatch carrier moving."),
          ev("S01-CH02-B00-L080", "action", "MC holds the narrow return lane long enough for the last courier to clear it.")]),
    beat("CH02-B00-BEAT-03", 3, "Witnesses at the Gate", "post-battle",
         ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Orléans Couriers", "Gate Guards"],
         "The recovered party returns through the gate with people and dispatches intact. Local witnesses now have a concrete story about MC's group.",
         "Close on reportable service rather than celebration. This is one independent reputation source, not enough by itself for command access.",
         "dialogue advance", "withdrawal_complete",
         "Reputation mission 1 is recorded. Another independent mission is still required for mandatory progression.", "CH02-REP-01",
         [ev("S01-CH02-B00-L090", "transition", "The party reaches the gate with people and dispatches intact."),
          ev("S01-CH02-B00-L100", "dialogue", "We would have lost the dispatches without them.", "Orléans Courier", "Orléans Courier"),
          ev("S01-CH02-B00-L110", "dialogue", "Tell the quartermaster what happened. Not a better version of it.", "Hangaku Gozen", "Hangaku Gozen"),
          ev("S01-CH02-B00-L120", "control", "Reputation progress: 1 independent mission completed. Complete one more of the three to unlock the mandatory route." )]),
]

b00b = {
    "id": "CH02-B00B", "title": "Supplies Under Fire", "type": "battle", "status": "draft", "scriptStatus": "draft",
    "location": "Supply approach outside Orléans", "time": "1–3 May 1429",
    "summary": "Free-order reputation mission 2/3. A supply train carrying food, bandages, and arrows is scattered under pressure. MC's group recovers the useful loads and escorts survivors back. This is a Fantasia local siege incident, not a claimed historical battle.",
    "beats": [
        beat("CH02-B00B-BEAT-01", 1, "Find What Still Moves", "battle-preview",
             ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Supply Drivers", "English skirmishers"],
             "A damaged supply train is spread across a dangerous approach. The party must identify surviving drivers and salvageable loads before choosing a return route.",
             "Achievement two tests prioritization under pressure: save people and useful supplies instead of treating every enemy as the objective.",
             "battle control", "mission_CH02-B00B_selected",
             "Survivors and the most important loads are identified before the enemy closes.", "CH02-B00B-BEAT-02",
             [ev("S01-CH02-B00B-L010", "control", "Objective: locate surviving drivers and mark the food, bandage, and arrow carts that can still move."),
              ev("S01-CH02-B00B-L020", "action", "Broken crates and frightened horses make the road look worse than the enemy numbers actually are."),
              ev("S01-CH02-B00B-L030", "dialogue", "We cannot take everything.", "Julie d’Aubigny", "Julie"),
              ev("S01-CH02-B00B-L040", "dialogue", "Then we take what the city cannot replace first.", "MC", "MC")]),
        beat("CH02-B00B-BEAT-02", 2, "Move the Loads", "battle-event",
             ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Supply Drivers", "English skirmishers"],
             "The party forms a moving escort around the recovered wagons while skirmishers pressure the rear and flank.",
             "Make the second report about reliability: MC keeps the route moving rather than breaking formation for kills.",
             "battle control", "supplies_prioritized",
             "The essential wagons and surviving drivers reach the safer lane toward Orléans.", "CH02-B00B-BEAT-03",
             [ev("S01-CH02-B00B-L050", "control", "Objective update: escort the marked wagons and surviving drivers to the gate route."),
              ev("S01-CH02-B00B-L060", "action", "A driver freezes when arrows strike the road ahead. MC takes the bridle and keeps the wagon moving."),
              ev("S01-CH02-B00B-L070", "dialogue", "Do not stop for me. Keep the line moving!", "Hangaku Gozen", "Hangaku Gozen"),
              ev("S01-CH02-B00B-L080", "action", "The group refuses the easier chase and keeps the escort intact.")]),
        beat("CH02-B00B-BEAT-03", 3, "The Quartermaster Counts", "post-battle",
             ["MC", "Julie d’Aubigny", "Quartermaster", "Supply Drivers"],
             "Back inside Orléans, the quartermaster counts recovered food, bandages, arrows, and living drivers rather than enemy bodies.",
             "Create an independent civilian/logistics report of competence. This can satisfy the second mandatory reputation source.",
             "dialogue advance", "supply_escort_complete",
             "Reputation mission 2 is recorded; if any other reputation mission is already complete, A Name Passed Upward unlocks.", "CH02-REP-01",
             [ev("S01-CH02-B00B-L090", "action", "The quartermaster checks the wagons twice before looking at the party."),
              ev("S01-CH02-B00B-L100", "dialogue", "Food, bandages, arrows, four drivers. Better than I expected.", "Quartermaster", "Quartermaster"),
              ev("S01-CH02-B00B-L110", "dialogue", "That sounded almost like praise.", "MC", "MC"),
              ev("S01-CH02-B00B-L120", "dialogue", "Do not get used to it.", "Quartermaster", "Quartermaster"),
              ev("S01-CH02-B00B-L130", "control", "Reputation progress updated. Mandatory route unlocks after any 2 of the 3 independent missions are complete." )]),
    ],
}

b00c = {
    "id": "CH02-B00C", "title": "The Outer Watch", "type": "battle", "status": "draft", "scriptStatus": "draft",
    "location": "Outer watch position near Orléans", "time": "1–3 May 1429",
    "summary": "Free-order reputation mission 3/3. A local watch position stops answering after an English probe. MC's group reinforces the surviving watch, prevents a collapse, and creates a route back. This is a Fantasia local siege incident, not a claimed historical battle.",
    "beats": [
        beat("CH02-B00C-BEAT-01", 1, "A Silent Post", "battle-preview",
             ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Orléans Watch", "English probe"],
             "The party reaches a damaged watch position and finds a handful of defenders pinned rather than destroyed.",
             "Achievement three tests reading a bad situation quickly. The goal is to stabilize local defenders, not replace them as heroes.",
             "battle control", "mission_CH02-B00C_selected",
             "The surviving watch is contacted and a defensible route is identified.", "CH02-B00C-BEAT-02",
             [ev("S01-CH02-B00C-L010", "control", "Objective: reach the silent watch and locate surviving defenders."),
              ev("S01-CH02-B00C-L020", "action", "The position looks abandoned until a hand rises behind a broken wall."),
              ev("S01-CH02-B00C-L030", "dialogue", "Five of us. Two hurt. They are waiting for us to run.", "Watch Sergeant", "Watch Sergeant"),
              ev("S01-CH02-B00C-L040", "dialogue", "Then we make the running part happen on our terms.", "MC", "MC")]),
        beat("CH02-B00C-BEAT-02", 2, "Hold, Then Break", "battle-event",
             ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Orléans Watch", "English probe"],
             "The party helps the watch hold just long enough to move the wounded and then breaks contact through a safer route.",
             "Show restraint and coordination. MC's party enables the local soldiers to survive rather than taking over their post permanently.",
             "battle control", "watch_contacted",
             "The defenders withdraw in order instead of being routed or trapped.", "CH02-B00C-BEAT-03",
             [ev("S01-CH02-B00C-L050", "control", "Objective update: hold until the wounded move, then break contact through the orchard lane."),
              ev("S01-CH02-B00C-L060", "dialogue", "Thirty breaths. Then we leave.", "Hangaku Gozen", "Hangaku Gozen"),
              ev("S01-CH02-B00C-L070", "action", "MC counts the retreat by people rather than by defeated enemies."),
              ev("S01-CH02-B00C-L080", "dialogue", "Last one is moving. Go!", "MC", "MC")]),
        beat("CH02-B00C-BEAT-03", 3, "A Sergeant's Report", "post-battle",
             ["MC", "Julie d’Aubigny", "Watch Sergeant", "La Hire"],
             "The watch sergeant reports that the outsiders reinforced the post, moved the wounded, and withdrew cleanly. La Hire hears the report separately from the other missions.",
             "This is a military witness independent of the courier and quartermaster accounts. If it is the second completed mission, the party has enough credibility to reach Dunois.",
             "dialogue advance", "watch_withdrawal_complete",
             "Reputation mission 3 is recorded; if any other reputation mission is already complete, A Name Passed Upward unlocks.", "CH02-REP-01",
             [ev("S01-CH02-B00C-L090", "dialogue", "They did not save the post. They saved the people in it.", "Watch Sergeant", "Watch Sergeant"),
              ev("S01-CH02-B00C-L100", "dialogue", "Good. Posts can be rebuilt.", "La Hire", "La Hire"),
              ev("S01-CH02-B00C-L110", "action", "La Hire looks toward MC's group, then back to the sergeant instead of making a ceremony of it."),
              ev("S01-CH02-B00C-L120", "control", "Reputation progress updated. Mandatory route unlocks after any 2 of the 3 independent missions are complete." )]),
    ],
}

# Insert the new missions directly after CH02-B00 if not already present.
ch02["nodes"] = [n for n in ch02["nodes"] if n["id"] not in {"CH02-B00B", "CH02-B00C"}]
insert_at = next(i for i, n in enumerate(ch02["nodes"]) if n["id"] == "CH02-B00") + 1
ch02["nodes"][insert_at:insert_at] = [b00b, b00c]

n02a = node(ch02, "CH02-N02A")
n02a["summary"] = "After any two of the three local reputation missions, multiple independent reports reach higher command. La Hire confirms his own firsthand experience, and Dunois finally treats MC's party as useful irregulars worth assigning to Saint-Loup."
n02a["beats"] = [
    beat("CH02-N02A-BEAT-01", 1, "Two Reports, Same Names", "story-scene",
         ["MC", "Julie d’Aubigny", "La Hire", "Jean de Dunois", "Orléans Messengers"],
         "Reports from at least two unrelated local groups reach Dunois: couriers, quartermasters, or watch soldiers depending on the missions completed. La Hire confirms he already saw the party hold together on the eastern road.",
         "Recognition must come from repeated evidence. The exact completed mission pair may vary, but the common fact is that independent witnesses describe the same reliable group.",
         "dialogue advance", "reputation_cluster_CH02-REP-01_complete_2_of_3",
         "Dunois now remembers the party as a proven irregular group rather than extra hands from La Hire's road column.", "CH02-N02A-BEAT-02",
         [ev("S01-CH02-N02A-L010", "action", "Two separate reports bearing the same unfamiliar names land on Dunois's table before La Hire enters."),
          ev("S01-CH02-N02A-L020", "dialogue", "Couriers, supply hands, the outer watch. Different problems. Same group keeps appearing in the reports.", "Jean de Dunois", "Dunois"),
          ev("S01-CH02-N02A-L030", "dialogue", "Same group I told you about from the eastern road.", "La Hire", "La Hire"),
          ev("S01-CH02-N02A-L040", "action", "Dunois finally looks at MC long enough to match the name to the face.")]),
    beat("CH02-N02A-BEAT-02", 2, "Work, Not Rank", "story-scene",
         ["MC", "Julie d’Aubigny", "La Hire", "Jean de Dunois"],
         "Dunois assigns the party to the supporting line for Saint-Loup. The offer is practical work and responsibility, not a title or privileged place in command.",
         "Make the promotion social rather than formal: the party has become useful enough to receive real work and to be included in an operational briefing.",
         "dialogue advance", "dunois_accepts_reports",
         "MC's group earns a supporting assignment for Saint-Loup and is called to the crowded briefing where Jeanne is present.", "CH02-N03",
         [ev("S01-CH02-N02A-L050", "dialogue", "I do not have ranks to hand out to strangers. I do have work for people who finish what they start.", "Jean de Dunois", "Dunois"),
          ev("S01-CH02-N02A-L060", "dialogue", "Work is fine. I still need answers when there is time.", "MC", "MC"),
          ev("S01-CH02-N02A-L070", "dialogue", "Survive Saint-Loup first. Then remind me about your impossible map.", "Jean de Dunois", "Dunois"),
          ev("S01-CH02-N02A-L080", "transition", "The group is called to a crowded operational briefing because repeated service has earned it a place in the supporting line.")]),
]

n03 = node(ch02, "CH02-N03")
n03["summary"] = "MC reaches Jeanne directly only after at least two independent local achievements, multiple reports, La Hire's confirmation, and Dunois's assignment. The meeting happens inside a crowded Saint-Loup briefing, not as a private audience or personal recruitment."
n03["beats"] = [
    beat("CH02-N03-BEAT-01", 1, "A Place at the Edge of the Room", "pre-battle",
         ["MC", "Julie d’Aubigny", "Jean de Dunois", "La Hire", "Bradamante", "Jeanne d’Arc"],
         "The party stands with other supporting groups at the edge of a crowded Saint-Loup briefing. Dunois names responsibilities; nobody treats MC as command staff.",
         "Show access as operational necessity. The party is present because Dunois assigned them after repeated reports.",
         "dialogue advance", "assigned_to_saint_loup",
         "MC's party understands its limited supporting role and sees Jeanne working as one participant among commanders, messengers, and fighters.", "CH02-N03-BEAT-02",
         [ev("S01-CH02-N03-L010", "action", "The room is crowded with messengers and fighters, not arranged for a private audience. MC's group stands near the door with other supporting units."),
          ev("S01-CH02-N03-L020", "dialogue", "The irregulars with the repeated local reports are with the supporting line. They answer to the field orders like everyone else.", "Jean de Dunois", "Dunois"),
          ev("S01-CH02-N03-L030", "action", "Bradamante checks her lance while Jeanne moves from one cluster of fighters to another instead of holding court.")]),
    beat("CH02-N03-BEAT-02", 2, "Jeanne the Person", "character-scene",
         ["MC", "Jeanne d’Arc", "Bradamante", "Jean de Dunois"],
         "Jeanne briefly speaks to MC's group while confirming the supporting line. She knows them from the reports, not because fate singled MC out.",
         "Make the first direct exchange practical and short. Jeanne is tired, direct, and human; MC remains socially junior.",
         "dialogue advance", "briefing_support_groups_confirmed",
         "MC and Jeanne finally meet before fighting in the same operation; Bradamante is established for Saint-Loup.", "CH02-B01",
         [ev("S01-CH02-N03-L040", "dialogue", "You are the group from the road reports.", "Jeanne d’Arc", "Jeanne"),
          ev("S01-CH02-N03-L050", "dialogue", "Two of them, at least. Apparently that was enough to get us into this room.", "MC", "MC"),
          ev("S01-CH02-N03-L060", "dialogue", "Enough to trust you with work. That matters more than the room.", "Jeanne d’Arc", "Jeanne"),
          ev("S01-CH02-N03-L070", "action", "She is pulled away by another messenger before the exchange can become anything grander."),
          ev("S01-CH02-N03-L080", "dialogue", "Bradamante. Stay near my lane at Saint-Loup and we will both have fewer surprises.", "Bradamante", "Bradamante"),
          ev("S01-CH02-N03-L090", "transition", "CH02-B01 — Saint-Loup.")]),
]

b01 = node(ch02, "CH02-B01")
b01["beats"] = [
    beat("CH02-B01-BEAT-01", 1, "Under the Arrows", "battle-preview",
         ["MC", "Jeanne d’Arc", "Jean de Dunois", "La Hire", "Bradamante", "French soldiers", "English defenders"],
         "The Saint-Loup assault begins under missile pressure. MC's group works from the supporting line while established commanders direct the larger attack.",
         "Escalate clearly from local missions to a major siege assault without promoting MC into command.",
         "battle control", "saint_loup_assault",
         "The supporting line crosses the exposed approach without bunching or collapsing.", "CH02-B01-BEAT-02",
         [ev("S01-CH02-B01-L010", "control", "Objective: cross the exposed approach and keep the supporting line intact."),
          ev("S01-CH02-B01-L020", "dialogue", "Do not bunch under the arrows! Keep moving!", "Jean de Dunois", "Dunois"),
          ev("S01-CH02-B01-L030", "action", "La Hire draws pressure across the approach while Bradamante watches for a safer lane.")]),
    beat("CH02-B01-BEAT-02", 2, "The Breach Lane", "battle-event",
         ["MC", "Bradamante", "La Hire", "French soldiers", "English defenders"],
         "Bradamante identifies a gap. MC's group helps widen and hold it long enough for more of the assault to pass.",
         "Give MC a meaningful contribution inside a larger battle: recognize and exploit an opening without becoming the person who wins Saint-Loup alone.",
         "battle control", "saint_loup_gap_opens",
         "The supporting force reaches the inner position and the English defense begins to fold.", "CH02-B01-BEAT-03",
         [ev("S01-CH02-B01-L040", "dialogue", "There. That gap.", "Bradamante", "Bradamante"),
          ev("S01-CH02-B01-L050", "dialogue", "I see it.", "MC", "MC"),
          ev("S01-CH02-B01-L060", "action", "MC advances with the assault instead of being protected by it."),
          ev("S01-CH02-B01-L065", "control", "Objective update: hold the breach lane until the supporting line passes through.")]),
    beat("CH02-B01-BEAT-03", 3, "After the Position Breaks", "post-battle",
         ["MC", "Julie d’Aubigny", "Jeanne d’Arc", "French soldiers", "Wounded"],
         "Saint-Loup falls. Cheers begin, but the wounded immediately turn victory into work.",
         "Make this the battle that spreads MC's reputation beyond the local witnesses while immediately complicating the idea of glory.",
         "dialogue advance", "saint_loup_secured",
         "Saint-Loup is secured; soldiers beyond La Hire's immediate circle now recognize MC's group, and the aftermath leads into The Cost of Hope.", "CH02-N05",
         [ev("S01-CH02-B01-L070", "action", "The position finally breaks. Cheers are cut short by the wounded being carried out."),
          ev("S01-CH02-B01-L080", "dialogue", "Help them first. Celebrate when there is room.", "Julie d’Aubigny", "Julie"),
          ev("S01-CH02-B01-L090", "transition", "CH02-N05 — The Cost of Hope.")]),
]

n05 = node(ch02, "CH02-N05")
n05["beats"] = [
    beat("CH02-N05-BEAT-01", 1, "After the Cheering", "aftermath",
         ["MC", "Julie d’Aubigny", "French soldiers", "Wounded"],
         "MC carries water and supplies among casualties while soldiers who now recognize the party ask for help without ceremony.",
         "Recognition should feel like responsibility before it feels like prestige.",
         "dialogue advance", "after_saint_loup",
         "MC feels the weight of becoming someone others expect to be useful.", "CH02-N05-BEAT-02",
         [ev("S01-CH02-N05-L010", "action", "MC stacks water beside the wounded long after the cheering from Saint-Loup has faded."),
          ev("S01-CH02-N05-L020", "dialogue", "People know your name now.", "Julie d’Aubigny", "Julie"),
          ev("S01-CH02-N05-L030", "dialogue", "I liked it better when they did not.", "MC", "MC")]),
    beat("CH02-N05-BEAT-02", 2, "Hope Still Has a Cost", "character-scene",
         ["MC", "Jeanne d’Arc", "Julie d’Aubigny"],
         "Jeanne briefly joins the casualty work after escaping another round of officers and civilians demanding certainty.",
         "Build connection through shared labor and fatigue, not destiny or instant friendship.",
         "dialogue advance", "casualty_work_continues",
         "Jeanne and MC understand each other slightly better; the next operation feels chosen rather than automatic.", "CH02-B02",
         [ev("S01-CH02-N05-L040", "action", "Jeanne arrives with the same exhausted expression after escaping another cluster of questions."),
          ev("S01-CH02-N05-L050", "dialogue", "That part does not improve.", "Jeanne d’Arc", "Jeanne"),
          ev("S01-CH02-N05-L060", "dialogue", "Then why keep going?", "MC", "MC"),
          ev("S01-CH02-N05-L070", "dialogue", "Because the wounded are still here, and the siege is still here.", "Jeanne d’Arc", "Jeanne"),
          ev("S01-CH02-N05-L080", "action", "MC hands another cup of water down the line before answering."),
          ev("S01-CH02-N05-L090", "dialogue", "Fine. One problem at a time.", "MC", "MC"),
          ev("S01-CH02-N05-L100", "transition", "CH02-B02 — Across the Loire / The Augustins.")]),
]

b02 = node(ch02, "CH02-B02")
b02["beats"] = [
    beat("CH02-B02-BEAT-01", 1, "Establish the Crossing", "battle-preview",
         ["MC", "Jeanne d’Arc", "La Hire", "Hangaku Gozen", "Bradamante", "French soldiers"],
         "The force begins crossing under pressure. MC's group is trusted with keeping one practical route open, not commanding the operation.",
         "Escalate from breach work to maintaining a vulnerable link between separated fronts.",
         "battle control", "loire_crossing",
         "The first crossing lane remains usable long enough for the operation to spread across the river.", "CH02-B02-BEAT-02",
         [ev("S01-CH02-B02-L010", "control", "Objective: establish the crossing and keep the first route open."),
          ev("S01-CH02-B02-L020", "dialogue", "If that crossing closes, half of us fight alone.", "Hangaku Gozen", "Hangaku Gozen"),
          ev("S01-CH02-B02-L030", "dialogue", "Then we keep it open.", "MC", "MC")]),
    beat("CH02-B02-BEAT-02", 2, "Separated Fronts", "battle-event",
         ["MC", "La Hire", "Hangaku Gozen", "French soldiers", "English defenders"],
         "Pressure rises on both sides of the crossing. La Hire carries orders while MC's group absorbs pressure and keeps movement possible.",
         "Make coordination, not raw victory, the middle turn of the battle.",
         "battle control", "crossing_established",
         "The French maintain enough connection between fronts to push toward the Augustins.", "CH02-B02-BEAT-03",
         [ev("S01-CH02-B02-L040", "action", "La Hire carries orders between separated fronts while the supporting line absorbs pressure at the crossing."),
          ev("S01-CH02-B02-L045", "control", "Objective update: keep both fronts connected while the assault shifts toward the Augustins."),
          ev("S01-CH02-B02-L048", "dialogue", "Do not chase. If the route breaks, we all pay for it.", "MC", "MC")]),
    beat("CH02-B02-BEAT-03", 3, "The Augustins Falls", "post-battle",
         ["MC", "Bradamante", "Julie d’Aubigny", "French soldiers"],
         "After sustained fighting the Augustins position gives way, but the force is exhausted and cannot pretend the next assault will be easy.",
         "End with physical cost and the need for recovery before Tourelles rather than a clean victory montage.",
         "dialogue advance", "augustins_position_breaks",
         "The Augustins falls. Exhaustion and casualties force a recovery beat before Tourelles.", "CH02-N06",
         [ev("S01-CH02-B02-L050", "action", "After sustained fighting, the Augustins position gives way."),
          ev("S01-CH02-B02-L060", "dialogue", "They are falling back toward the Tourelles.", "Bradamante", "Bradamante"),
          ev("S01-CH02-B02-L070", "dialogue", "And we are barely standing.", "Julie d’Aubigny", "Julie"),
          ev("S01-CH02-B02-L080", "transition", "CH02-N06 — Before the Tourelles.")]),
]

n06 = node(ch02, "CH02-N06")
n06["beats"] = [
    beat("CH02-N06-BEAT-01", 1, "No Victory Lap", "quiet-scene",
         ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Jeanne d’Arc", "La Hire"],
         "Weapons are repaired, bandages changed, and people sleep wherever they can. Jeanne wants to continue while others openly acknowledge exhaustion.",
         "Create friction and recovery before Tourelles. Nobody is fearless and no one gets to call exhaustion weakness.",
         "dialogue advance", "augustins_aftermath",
         "The group admits both the necessity and the cost of another assault.", "CH02-N06-BEAT-02",
         [ev("S01-CH02-N06-L010", "action", "The camp is quieter than a victory should be. People repair straps, wash blood from hands, and sleep wherever they can."),
          ev("S01-CH02-N06-L020", "dialogue", "If we go again tomorrow, some of these people will not come back.", "Julie d’Aubigny", "Julie"),
          ev("S01-CH02-N06-L030", "dialogue", "If we stop now, the Tourelles still controls the crossing.", "Jeanne d’Arc", "Jeanne"),
          ev("S01-CH02-N06-L040", "dialogue", "Both things can be true.", "Hangaku Gozen", "Hangaku Gozen"),
          ev("S01-CH02-N06-L050", "action", "Nobody answers for a moment.")]),
    beat("CH02-N06-BEAT-02", 2, "Tomorrow Is My Choice", "character-scene",
         ["MC", "Julie d’Aubigny", "Jeanne d’Arc"],
         "MC separates personal choice from political allegiance and chooses to return to the line because people will be left behind otherwise.",
         "Keep MC's reason personal and consistent with the story so far; helping here does not mean swearing their life to France.",
         "dialogue advance", "night_before_tourelles",
         "MC chooses to fight at Tourelles while retaining the larger goal of answers and a route home.", "CH02-B03",
         [ev("S01-CH02-N06-L060", "dialogue", "I came here looking for a way home. Somehow I keep finding reasons not to leave people behind.", "MC", "MC"),
          ev("S01-CH02-N06-L070", "dialogue", "That is not the same as owing France your life.", "Julie d’Aubigny", "Julie"),
          ev("S01-CH02-N06-L080", "dialogue", "No. Tomorrow is my choice.", "MC", "MC"),
          ev("S01-CH02-N06-L090", "transition", "CH02-B03 — The Tourelles.")]),
]

b03 = node(ch02, "CH02-B03")
b03["beats"] = [
    beat("CH02-B03-BEAT-01", 1, "The Wound", "battle-event",
         ["MC", "Jeanne d’Arc", "Julie d’Aubigny", "La Hire", "French soldiers"],
         "During the assault Jeanne is wounded and removed from the immediate line. The attack stalls as soldiers react to seeing her fall.",
         "Treat the wound as dangerous and frightening. No miraculous healing.",
         "battle control", "tourelles_assault_midpoint",
         "The objective shifts from assault to hold/protect/reorganize while Jeanne is treated.", "CH02-B03-BEAT-02",
         [ev("S01-CH02-B03-L010", "action", "The assault compresses against the fortifications under heavy fire."),
          ev("S01-CH02-B03-L020", "action", "Jeanne jerks backward and falls among the front ranks."),
          ev("S01-CH02-B03-L030", "dialogue", "Jeanne!", "MC", "MC"),
          ev("S01-CH02-B03-L040", "dialogue", "Get her back! Now!", "Julie d’Aubigny", "Julie")]),
    beat("CH02-B03-BEAT-02", 2, "Hold Without Her", "battle-event",
         ["MC", "Julie d’Aubigny", "La Hire", "French soldiers", "Wounded"],
         "With Jeanne behind the line, the immediate goal becomes preventing collapse, protecting the treatment area, and keeping a route open.",
         "Make the objective shift mechanically and emotionally honest. MC does not replace Jeanne as commander or symbol.",
         "battle control", "jeanne_removed_for_treatment",
         "The French line survives the shock long enough to reorganize instead of collapsing.", "CH02-B03-BEAT-03",
         [ev("S01-CH02-B03-L050", "control", "Objective update: hold the line, protect the wounded, and prevent the assault from collapsing."),
          ev("S01-CH02-B03-L060", "dialogue", "Nobody chases. Nobody panics. Hold what we have!", "La Hire", "La Hire"),
          ev("S01-CH02-B03-L070", "action", "MC helps close a gap near the withdrawal route while Julie keeps the treatment lane clear.")]),
    beat("CH02-B03-BEAT-03", 3, "Bandaged Return", "battle-climax",
         ["MC", "Jeanne d’Arc", "Julie d’Aubigny", "La Hire", "French soldiers"],
         "Jeanne later returns visibly bandaged. Her return restores morale enough for the final assault to resume; the battle is completed by the whole force.",
         "Preserve the approved wound → hold/protect → bandaged return flow without supernatural recovery or solo-protagonist replacement.",
         "battle control", "line_reorganized_and_jeanne_returns",
         "The Tourelles falls and the siege reaches its breaking point.", "CH02-N08",
         [ev("S01-CH02-B03-L080", "action", "A shout travels from the rear. Jeanne returns, pale and visibly bandaged, moving carefully but upright."),
          ev("S01-CH02-B03-L090", "dialogue", "You are supposed to be lying down.", "MC", "MC"),
          ev("S01-CH02-B03-L100", "dialogue", "Later.", "Jeanne d’Arc", "Jeanne"),
          ev("S01-CH02-B03-L110", "control", "Objective update: resume the final assault and secure the Tourelles."),
          ev("S01-CH02-B03-L120", "action", "The renewed assault finally breaks the position."),
          ev("S01-CH02-B03-L130", "transition", "CH02-N08 — The Siege Is Lifted.")]),
]

n08 = node(ch02, "CH02-N08")
n08["beats"] = [
    beat("CH02-N08-BEAT-01", 1, "The English Leave", "aftermath",
         ["MC", "Julie d’Aubigny", "Jeanne d’Arc", "La Hire", "Civilians"],
         "On 8 May the English withdrawal becomes visible. The city reacts with exhausted relief rather than a clean heroic tableau.",
         "Resolve the siege historically while keeping the human cost present.",
         "dialogue advance", "english_withdrawal_visible",
         "Orléans is no longer under the same siege pressure and the chapter's military objective is achieved.", "CH02-N08-BEAT-02",
         [ev("S01-CH02-N08-L010", "action", "By morning the English positions are emptying. People climb walls and roofs just to be certain."),
          ev("S01-CH02-N08-L020", "dialogue", "They're leaving.", "Civilian", "Civilian"),
          ev("S01-CH02-N08-L030", "dialogue", "Then let them leave before someone invents one more fight for today.", "Julie d’Aubigny", "Julie")]),
    beat("CH02-N08-BEAT-02", 2, "Useful Does Not Mean Finished", "chapter-end",
         ["MC", "Julie d’Aubigny", "Jeanne d’Arc", "Hangaku Gozen", "La Hire"],
         "MC's party is now genuinely recognized after repeated local service and the major siege battles, but MC still has no formal rank and still wants answers about home.",
         "Close the chapter with earned reputation and an open personal goal rather than instant belonging.",
         "dialogue advance", "siege_lifted",
         "Chapter 2 ends with the party recognized as proven irregulars and the road toward the post-Orléans campaign opening.", "CH03",
         [ev("S01-CH02-N08-L040", "dialogue", "People know us now. That still feels strange.", "MC", "MC"),
          ev("S01-CH02-N08-L050", "dialogue", "They know what you did. That is different from knowing you.", "Hangaku Gozen", "Hangaku Gozen"),
          ev("S01-CH02-N08-L060", "dialogue", "Good. I still have questions they cannot answer for me.", "MC", "MC"),
          ev("S01-CH02-N08-L070", "narration", "CHAPTER 2 COMPLETE"),
          ev("S01-CH02-N08-L080", "transition", "Next: Chapter 3 — The Road to the Crown.")]),
]

# --- CH03 restore granularity where major one-beat sequences hid multiple turns ---
b01_3 = node(ch03, "CH03-B01")
b01_3["beats"] = [
    beat("CH03-B01-BEAT-01", 1, "Approach Jargeau", "battle-preview",
         ["MC", "Jeanne d’Arc", "Jean II d’Alençon", "William de la Pole, Earl of Suffolk", "French soldiers"],
         "The assault begins against a prepared English defense. Alençon keeps the advance controlled while Suffolk tries to break French momentum.",
         "Establish Jargeau as a real campaign battle with command structure on both sides.", "battle control", "jargeau_assault",
         "The French reach the main defenses without turning the opening into a reckless rush.", "CH03-B01-BEAT-02",
         [ev("S01-CH03-B01-L010", "control", "Objective: reach the main defenses while keeping the assault line coherent."),
          ev("S01-CH03-B01-L020", "dialogue", "They have momentum. Break it here.", "William de la Pole, Earl of Suffolk", "Suffolk"),
          ev("S01-CH03-B01-L030", "action", "The French push through the outer defenses in successive waves rather than a single rush.")]),
    beat("CH03-B01-BEAT-02", 2, "Inside the Pressure", "battle-event",
         ["MC", "Jeanne d’Arc", "Jean II d’Alençon", "French soldiers", "English soldiers"],
         "The assault becomes a sustained contest over breaches and streets. MC operates as one proven fighter among the forward groups.",
         "Avoid collapsing a whole siege assault into one line. Reputation now means dependable placement, not special command.", "battle control", "jargeau_outer_defense_breached",
         "French pressure reaches the point where organized English resistance can no longer hold every approach.", "CH03-B01-BEAT-03",
         [ev("S01-CH03-B01-L040", "dialogue", "Keep the pressure. Do not outrun the line.", "Jean II d’Alençon", "Alençon"),
          ev("S01-CH03-B01-L045", "control", "Objective update: secure the breach and prevent the forward line from fragmenting."),
          ev("S01-CH03-B01-L048", "action", "MC's group rotates wounded fighters out while fresh soldiers press through the same opening.")]),
    beat("CH03-B01-BEAT-03", 3, "Suffolk Captured", "post-battle",
         ["MC", "William de la Pole, Earl of Suffolk", "Jean II d’Alençon", "French soldiers"],
         "Organized resistance collapses and Suffolk is captured. Victory immediately creates prisoners, wounded, and the next campaign problem.",
         "End the battle on consequences instead of treating capture as a boss trophy.", "dialogue advance", "jargeau_resistance_collapses",
         "Jargeau falls; Suffolk is captured; the campaign pauses long enough to process the result.", "CH03-N02",
         [ev("S01-CH03-B01-L050", "action", "By the battle's end organized resistance collapses and Suffolk is taken prisoner."),
          ev("S01-CH03-B01-L055", "dialogue", "Secure the prisoners. Find the wounded before the cheering gets in the way.", "Jean II d’Alençon", "Alençon"),
          ev("S01-CH03-B01-L060", "transition", "CH03-N02 — After Jargeau.")]),
]

n02_3 = node(ch03, "CH03-N02")
old = n02_3["beats"][0]["script"]
n02_3["beats"] = [
    beat("CH03-N02-BEAT-01", 1, "A Reputation Is Work", "aftermath",
         ["MC", "Julie d’Aubigny", "French soldiers", "Wounded", "Prisoners"],
         "The field after Jargeau becomes lists, wounded, prisoners, supplies, and repairs. Recognition mostly means more people ask MC's group for help.",
         "Turn recognition into responsibility rather than protagonist privilege.", "dialogue advance", "jargeau_won",
         "MC sees reputation becoming ordinary work and expectation.", "CH03-N02-BEAT-02", old[:6]),
    beat("CH03-N02-BEAT-02", 2, "Forward Column Tomorrow", "character-scene",
         ["MC", "Jean II d’Alençon", "Jeanne d’Arc", "Julie d’Aubigny"],
         "Alençon now addresses the party without La Hire introducing them. A small disagreement over campaign pace follows while wounded are still being moved.",
         "Recognition is now believable because Orléans and Jargeau produced repeated firsthand evidence.", "dialogue advance", "jargeau_aftermath_work",
         "Alençon personally knows the group and keeps them with the forward column; the next campaign leg begins with unresolved fatigue.", "CH03-N03", old[6:]),
]

n04_3 = node(ch03, "CH03-N04")
old = n04_3["beats"][0]["script"]
n04_3["beats"] = [
    beat("CH03-N04-BEAT-01", 1, "Bad Information", "pre-battle",
         ["MC", "La Hire", "Jean II d’Alençon", "Jeanne d’Arc", "Scouts"],
         "Scouts bring conflicting positions for the withdrawing English. Nobody knows yet that Patay will become a famous victory.",
         "Create uncertainty before the decision to press.", "dialogue advance", "english_withdrawal_reported",
         "The commanders understand they have a narrow opportunity but incomplete information.", "CH03-N04-BEAT-02", old[:4]),
    beat("CH03-N04-BEAT-02", 2, "Before the Line Sets", "pre-battle",
         ["MC", "La Hire", "Jean II d’Alençon", "Jeanne d’Arc"],
         "La Hire argues that waiting guarantees a prepared English line. The vanguard moves to make contact while the rest follows cautiously.",
         "Make Patay causality explicit: the opportunity exists because the French catch the withdrawal before deployment stabilizes.", "dialogue advance", "patay_opportunity_identified",
         "La Hire's vanguard moves to make contact before the English position stabilizes.", "CH03-B02", old[4:]),
]

b02_3 = node(ch03, "CH03-B02")
b02_3["beats"] = [
    beat("CH03-B02-BEAT-01", 1, "Contact Before Deployment", "battle-preview",
         ["MC", "La Hire", "John Talbot", "Jean II d’Alençon", "French soldiers", "English soldiers"],
         "The French vanguard catches the retreating English before their field line is fully established.",
         "Patay begins as an opportunity created by timing, not as a guaranteed scripted victory.", "battle control", "patay_contact",
         "The French reach the incomplete position before Talbot can fully organize it.", "CH03-B02-BEAT-02",
         [ev("S01-CH03-B02-L010", "control", "Objective: strike before the English line fully forms."),
          ev("S01-CH03-B02-L020", "dialogue", "Now! Do not give them time to plant themselves!", "La Hire", "La Hire"),
          ev("S01-CH03-B02-L030", "action", "Mounted French forces surge toward the incomplete position.")]),
    beat("CH03-B02-BEAT-02", 2, "The Line Breaks", "battle-event",
         ["MC", "La Hire", "John Talbot", "French soldiers", "English soldiers"],
         "Talbot tries to stabilize the defense while French pressure hits before the formation is ready.",
         "Keep Talbot formidable even while circumstances turn sharply against him.", "battle control", "patay_line_contested",
         "The incomplete English formation breaks and the battle turns into collapse and capture.", "CH03-B02-BEAT-03",
         [ev("S01-CH03-B02-L040", "dialogue", "Hold the line!", "John Talbot", "Talbot"),
          ev("S01-CH03-B02-L050", "action", "The formation breaks before it can become the defense Talbot wanted."),
          ev("S01-CH03-B02-L055", "control", "Objective update: prevent an organized withdrawal while preserving the French advance.")]),
    beat("CH03-B02-BEAT-03", 3, "Talbot Under Guard", "post-battle",
         ["MC", "John Talbot", "La Hire", "Jean II d’Alençon"],
         "Talbot is captured. He remains composed enough to warn that one badly timed defeat does not end the war.",
         "Give the battle an aftermath beat and preserve Talbot's weight as a future threat rather than a disposable boss.", "dialogue advance", "talbot_captured",
         "Patay ends with Talbot captured and the French campaign politically transformed, but not complete.", "CH03-N05",
         [ev("S01-CH03-B02-L060", "action", "Talbot is brought under guard, furious but composed."),
          ev("S01-CH03-B02-L070", "dialogue", "Do not mistake catching an army unready for the end of the war.", "John Talbot", "Talbot"),
          ev("S01-CH03-B02-L080", "dialogue", "Nobody here looks like they think the war is over.", "MC", "MC"),
          ev("S01-CH03-B02-L090", "transition", "CH03-N05 — The Road to Reims.")]),
]

# Ensure every CH02/CH03 battle now has visible multi-beat structure.
for chapter in (ch02, ch03):
    for n in chapter["nodes"]:
        if n.get("type") == "battle" and len(n.get("beats", [])) < 2:
            raise RuntimeError(f"{n['id']} is still a one-beat battle")

# Refresh CH02/CH03 production overlays from canonical beat data.
for chapter in (ch02, ch03):
    for n in chapter["nodes"]:
        for b in n["beats"]:
            chars = b.get("characters", [])[:3]
            slots = {}
            for slot_name, character in zip(("left", "center", "right"), chars):
                slots[slot_name] = {"character": character, "shortLabel": "".join(p[0] for p in character.split() if p)[:3].upper(), "pose": "active"}
            if n.get("type") == "battle" or "battle" in b.get("presentation", ""):
                timing = {"mode": "player", "minSeconds": 25, "maxSeconds": 120}
                camera = "Tactical overview → event focus"
            else:
                timing = {"mode": "advance", "estimatedSeconds": 24}
                camera = "Scene framing → character focus"
            prod["beats"][b["id"]] = {
                "timing": timing,
                "staging": {"background": n.get("location", n["title"]), "camera": camera, "slots": slots},
                "events": [
                    {"type": "action", "text": b["screenAction"]},
                    {"type": "dialogue", "text": b["dialogueIntent"]},
                    {"type": "transition", "text": f"Continue to {b.get('next', 'next beat')}."},
                ],
            }

# Minimal schema validation for routeClusters.
build = build_path.read_text()
needle = '    assert(Array.isArray(chapter.nodes), `${chapter.id} nodes must be an array`);\n'
insert = '''    assert(Array.isArray(chapter.nodes), `${chapter.id} nodes must be an array`);\n    const chapterNodeIds = new Set(chapter.nodes.map((node) => node.id));\n    if (chapter.routeClusters !== undefined) {\n      assert(Array.isArray(chapter.routeClusters), `${chapter.id}.routeClusters must be an array`);\n      for (const cluster of chapter.routeClusters) {\n        assert(typeof cluster.id === "string" && cluster.id, `${chapter.id} route cluster needs an id`);\n        assert(cluster.mode === "complete-any", `${cluster.id}.mode must be complete-any`);\n        assert(Array.isArray(cluster.nodeIds) && cluster.nodeIds.length > 0, `${cluster.id}.nodeIds must be non-empty`);\n        assert(Number.isInteger(cluster.requiredCount) && cluster.requiredCount > 0 && cluster.requiredCount <= cluster.nodeIds.length, `${cluster.id}.requiredCount is invalid`);\n        assert(typeof cluster.reconvergesAt === "string" && cluster.reconvergesAt, `${cluster.id}.reconvergesAt is required`);\n        for (const routeNodeId of cluster.nodeIds) {\n          assert(chapterNodeIds.has(routeNodeId), `${cluster.id} references unknown node: ${routeNodeId}`);\n        }\n        assert(chapterNodeIds.has(cluster.reconvergesAt), `${cluster.id} reconverges at unknown node: ${cluster.reconvergesAt}`);\n      }\n    }\n'''
if needle not in build:
    raise RuntimeError("build validator insertion point missing")
build = build.replace(needle, insert, 1)
build_path.write_text(build)

# Story Studio route-cluster review panel.
app = app_path.read_text()
needle = '''function currentBeat() {\n  return currentNode()?.beats.find((beat) => beat.id === state.beatId) ?? null;\n}\n'''
insert = '''function currentBeat() {\n  return currentNode()?.beats.find((beat) => beat.id === state.beatId) ?? null;\n}\n\nfunction currentRouteCluster() {\n  const chapter = currentChapter();\n  const node = currentNode();\n  if (!chapter || !node || !Array.isArray(chapter.routeClusters)) return null;\n  return (\n    chapter.routeClusters.find(\n      (cluster) => cluster.nodeIds?.includes(node.id) || cluster.reconvergesAt === node.id,\n    ) ?? null\n  );\n}\n'''
if needle not in app:
    raise RuntimeError("app function insertion point missing")
app = app.replace(needle, insert, 1)

needle = '  const scriptBadge = node.scriptStatus\n'
insert = '''  const cluster = currentRouteCluster();\n  const clusterPanel = cluster\n    ? `<div class="route-cluster-panel">\n        <span class="section-label">Free-order route · ${escapeHtml(cluster.id)}</span>\n        <strong>${escapeHtml(cluster.title ?? "Route cluster")}</strong>\n        <p>${escapeHtml(cluster.summary ?? "")}</p>\n        <div class="tag-list">\n          <span class="tag">Complete any ${escapeHtml(cluster.requiredCount)} of ${escapeHtml(cluster.nodeIds.length)}</span>\n          <span class="tag">Reconverges: ${escapeHtml(cluster.reconvergesAt)}</span>\n          ${cluster.optionalAfterThreshold ? `<span class="tag">Remaining mission optional after threshold</span>` : ""}\n        </div>\n      </div>`\n    : "";\n  const scriptBadge = node.scriptStatus\n'''
if needle not in app:
    raise RuntimeError("app route panel insertion point missing")
app = app.replace(needle, insert, 1)

needle = '    <p class="node-summary">${escapeHtml(node.summary)}</p>\n  `;\n'
replace = '    <p class="node-summary">${escapeHtml(node.summary)}</p>\n    ${clusterPanel}\n  `;\n'
if needle not in app:
    raise RuntimeError("app node header panel target missing")
app = app.replace(needle, replace, 1)
app_path.write_text(app)

story_path.write_text(json.dumps(story, indent=2, ensure_ascii=False) + "\n")
prod_path.write_text(json.dumps(prod, indent=2, ensure_ascii=False) + "\n")
print("GAME-NAR09 materialized")
