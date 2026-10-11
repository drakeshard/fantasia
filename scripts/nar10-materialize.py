import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORY_PATH = ROOT / "content/narrative/story.json"
PRODUCTION_PATH = ROOT / "content/narrative/story-production.json"

story = json.loads(STORY_PATH.read_text())
production = json.loads(PRODUCTION_PATH.read_text())
saga = next(s for s in story["sagas"] if s["id"] == "S01")

# Owner-approved status-only freeze for the current NAR09 CH02/CH03 content.
for chapter_id in ("CH02", "CH03"):
    chapter = next(c for c in saga["chapters"] if c["id"] == chapter_id)
    chapter["status"] = "approved-structure"
    for node in chapter["nodes"]:
        node["status"] = "approved-structure"
        node["scriptStatus"] = "approved"
        for beat in node["beats"]:
            beat["scriptStatus"] = "approved"


def chapter4():
    return {
        "id": "CH04",
        "title": "The Maid Falls",
        "status": "draft",
        "nodes": [
            {
                "id": "CH04-N01",
                "title": "After the Crown",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Road from Reims toward the Île-de-France",
                "time": "Late July–August 1429",
                "summary": "The coronation creates momentum but solves neither the war nor MC's route home. Jeanne presses toward Paris while command support becomes more cautious, and a second small refractive anomaly makes the earlier Reims glimpse harder to dismiss.",
                "beats": [
                    {
                        "id": "CH04-N01-BEAT-01",
                        "order": 1,
                        "title": "Victory Keeps Moving",
                        "presentation": "travel-dialogue",
                        "characters": ["MC", "Jeanne d’Arc", "Julie d’Aubigny", "Jean d’Aulon"],
                        "screenAction": "The army leaves Reims behind. Jeanne is already thinking about Paris, while MC discovers that coronation celebrations produced no new clue about Primora or Vaelkrath.",
                        "dialogueIntent": "Turn the coronation high into forward pressure. MC stays because relationships now matter, not because the home problem vanished.",
                        "playerControl": "dialogue advance",
                        "trigger": "chapter_start",
                        "result": "The group continues toward Paris with hope still high but no guarantee that the campaign will keep accelerating.",
                        "next": "CH04-N01-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N01-L010", "type": "action", "text": "Reims disappears behind the column one road at a time. The banners are brighter than the faces carrying them."},
                            {"id": "S01-CH04-N01-L020", "type": "dialogue", "text": "I asked three merchants, two clerks, and a priest. Still nothing about Primora or Vaelkrath.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N01-L030", "type": "dialogue", "text": "I am sorry.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH04-N01-L040", "type": "dialogue", "text": "I know. I just thought a king getting crowned might make impossible answers easier to find.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N01-L050", "type": "dialogue", "text": "Kings are usually better at creating new questions.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-N01-L060", "type": "dialogue", "text": "Paris first. Then we see what road remains.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"}
                        ]
                    },
                    {
                        "id": "CH04-N01-BEAT-02",
                        "order": 2,
                        "title": "The Light Moves Wrong",
                        "presentation": "mystery-beat",
                        "characters": ["MC", "Julie d’Aubigny"],
                        "screenAction": "At a roadside halt, light bends for an instant across a wagon's metal rim. This time Julie catches enough of the distortion to know MC did not simply imagine it.",
                        "dialogueIntent": "Increase the anomaly clue slightly without naming, explaining, or making it useful.",
                        "playerControl": "dialogue advance",
                        "trigger": "roadside_halt",
                        "result": "MC is no longer the only person to have noticed something visually wrong, but neither has an explanation.",
                        "next": "CH04-B01",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N01-L070", "type": "action", "text": "Sunlight catches a wagon rim. For one heartbeat the reflection bends sideways through empty air instead of following the metal."},
                            {"id": "S01-CH04-N01-L080", "type": "dialogue", "text": "There. Again.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N01-L090", "type": "dialogue", "text": "I saw something move. I do not know what.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-N01-L100", "type": "action", "text": "The reflection settles into ordinary sunlight before either can move closer."},
                            {"id": "S01-CH04-N01-L110", "type": "dialogue", "text": "That makes two of us who do not know.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N01-L120", "type": "transition", "text": "CH04-B01 — The Walls of Paris."}
                        ]
                    }
                ]
            },
            {
                "id": "CH04-B01",
                "title": "The Walls of Paris",
                "type": "battle",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Paris — Saint-Honoré approach",
                "time": "8 September 1429",
                "summary": "The royal assault on Paris fails. Jeanne is wounded in the thigh during the fighting, and the playable objective changes from gaining a foothold to protecting the wounded and disengaging under orders rather than pretending the setback is a victory.",
                "beats": [
                    {
                        "id": "CH04-B01-BEAT-01",
                        "order": 1,
                        "title": "At the Ditch",
                        "presentation": "battle-preview",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "French soldiers", "Paris defenders"],
                        "screenAction": "The assault presses toward the Saint-Honoré defenses under heavy missile fire. The immediate problem is crossing exposed ground and finding a workable approach, not defeating every defender.",
                        "dialogueIntent": "Make Paris feel harder and less inevitable than the Loire victories.",
                        "playerControl": "battle control",
                        "trigger": "paris_assault_begins",
                        "result": "The forward groups reach the ditch and test the defenses but fail to create a secure breach.",
                        "next": "CH04-B01-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B01-L010", "type": "control", "text": "Objective: reach the Saint-Honoré ditch and establish a safe foothold for the assault."},
                            {"id": "S01-CH04-B01-L020", "type": "action", "text": "Missiles strike the earth and timber around the advancing French line. Paris does not open the way the Loire towns did."},
                            {"id": "S01-CH04-B01-L030", "type": "dialogue", "text": "Do not chase the wall. Find the ground that gets us to it alive.", "speaker": "Jean d’Aulon", "displayLabel": "d’Aulon"},
                            {"id": "S01-CH04-B01-L040", "type": "dialogue", "text": "That is a very different kind of encouragement.", "speaker": "MC", "displayLabel": "MC"}
                        ]
                    },
                    {
                        "id": "CH04-B01-BEAT-02",
                        "order": 2,
                        "title": "Jeanne Wounded",
                        "presentation": "battle-event",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "French soldiers"],
                        "screenAction": "During the stalled assault Jeanne is struck in the thigh and can no longer keep pressing the ditch. d’Aulon and nearby fighters move to get her clear while the line remains exposed.",
                        "dialogueIntent": "Turn the battle honestly. The injury is serious enough to change the objective but is not supernatural or fatal.",
                        "playerControl": "battle control",
                        "trigger": "paris_assault_stalls",
                        "result": "The priority changes from advancing to getting Jeanne and the forward wounded back through a viable retreat lane.",
                        "next": "CH04-B01-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B01-L050", "type": "action", "text": "A shot strikes Jeanne in the thigh. She drops hard beside the ditch and tries to rise before d’Aulon reaches her."},
                            {"id": "S01-CH04-B01-L060", "type": "dialogue", "text": "No. Not on that leg.", "speaker": "Jean d’Aulon", "displayLabel": "d’Aulon"},
                            {"id": "S01-CH04-B01-L070", "type": "dialogue", "text": "The line is still there.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH04-B01-L080", "type": "dialogue", "text": "And it will still be there if we get you out first.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-B01-L090", "type": "control", "text": "Objective changes: PROTECT THE WOUNDED. Hold a retreat lane and move Jeanne away from the ditch."}
                        ]
                    },
                    {
                        "id": "CH04-B01-BEAT-03",
                        "order": 3,
                        "title": "Withdraw",
                        "presentation": "escape-gameplay",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "French soldiers"],
                        "screenAction": "The assault is called off. The player must disengage the exposed forward group rather than continue an attack that no longer has a workable objective.",
                        "dialogueIntent": "Let the loss remain a loss. Success means bringing people back after the assault fails.",
                        "playerControl": "battle control / withdrawal",
                        "trigger": "withdrawal_order_received",
                        "result": "The French assault ends without taking Paris; Jeanne and the surviving forward group are extracted.",
                        "next": "CH04-N03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B01-L100", "type": "control", "text": "Objective changes: WITHDRAW. Reach the rear line with Jeanne and the required wounded units."},
                            {"id": "S01-CH04-B01-L110", "type": "dialogue", "text": "We are leaving?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-B01-L120", "type": "dialogue", "text": "We are not taking Paris tonight. Make sure we do not lose everyone proving it.", "speaker": "Jean d’Aulon", "displayLabel": "d’Aulon"},
                            {"id": "S01-CH04-B01-L130", "type": "action", "text": "The forward group pulls back by sections. The walls remain behind them, intact and occupied."},
                            {"id": "S01-CH04-B01-L140", "type": "transition", "text": "CH04-N03 — The Long Winter."}
                        ]
                    }
                ]
            },
            {
                "id": "CH04-N03",
                "title": "The Long Winter",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Northern France — campaign roads and winter quarters",
                "time": "September 1429–spring 1430",
                "summary": "Months pass without another Orléans-style breakthrough. Forces disperse, negotiations and smaller campaigns replace the triumphal march, Jeanne recovers and keeps fighting, and MC's friendship with her deepens while the route home remains unsolved.",
                "beats": [
                    {
                        "id": "CH04-N03-BEAT-01",
                        "order": 1,
                        "title": "Momentum Ends",
                        "presentation": "time-passage",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny"],
                        "screenAction": "The story compresses months of reduced momentum: Paris is not retaken, large formations disperse, Jeanne recovers, and campaigning becomes smaller and less certain.",
                        "dialogueIntent": "Show a real strategic slowdown without reducing it to one villainous decision or a simple betrayal narrative.",
                        "playerControl": "dialogue advance",
                        "trigger": "paris_withdrawal_complete",
                        "result": "The triumphant rhythm of Orléans-to-Reims is over and the characters adjust to a more fragmented war.",
                        "next": "CH04-N03-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N03-L010", "type": "narration", "text": "Autumn becomes winter. The army that marched to Reims does not remain one army forever."},
                            {"id": "S01-CH04-N03-L020", "type": "action", "text": "Orders grow smaller. Roads grow worse. Victories become local things measured in bridges, towns, supplies, and who is still present afterward."},
                            {"id": "S01-CH04-N03-L030", "type": "action", "text": "Jeanne's leg heals enough for campaigning. The certainty around her does not heal with it."}
                        ]
                    },
                    {
                        "id": "CH04-N03-BEAT-02",
                        "order": 2,
                        "title": "Two Unfinished Roads",
                        "presentation": "character-scene",
                        "characters": ["MC", "Jeanne d’Arc"],
                        "screenAction": "During a quiet halt, MC and Jeanne compare two problems neither can simply solve: MC still cannot find home, and Jeanne cannot force the war to keep moving at the pace everyone once expected.",
                        "dialogueIntent": "Deepen friendship through shared frustration rather than prophecy, romance, or cosmology exposition.",
                        "playerControl": "dialogue advance",
                        "trigger": "winter_halt",
                        "result": "MC and Jeanne understand one another less as symbols and more as people continuing without clear answers.",
                        "next": "CH04-N03-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N03-L040", "type": "dialogue", "text": "Do you ever get tired of being told what you are supposed to do next?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N03-L050", "type": "dialogue", "text": "Yes.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH04-N03-L060", "type": "dialogue", "text": "That was faster than I expected.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N03-L070", "type": "dialogue", "text": "I can be tired and still go.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH04-N03-L080", "type": "dialogue", "text": "...Yes. I think I know that one.", "speaker": "MC", "displayLabel": "MC"}
                        ]
                    },
                    {
                        "id": "CH04-N03-BEAT-03",
                        "order": 3,
                        "title": "News from Compiègne",
                        "presentation": "transition",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Messenger"],
                        "screenAction": "In May 1430, reports arrive that Compiègne is under Burgundian pressure. Jeanne prepares to move with a much smaller force than the army that marched to Reims.",
                        "dialogueIntent": "Move causally into the capture campaign without pretending it has the resources or certainty of 1429.",
                        "playerControl": "dialogue advance",
                        "trigger": "compiegne_report_arrives",
                        "result": "Jeanne's group turns toward Compiègne and MC chooses to remain with the smaller campaign.",
                        "next": "CH04-N04",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N03-L090", "type": "dialogue", "text": "Compiègne is asking for help. Burgundian forces are closing around it.", "speaker": "Messenger", "displayLabel": "Messenger"},
                            {"id": "S01-CH04-N03-L100", "type": "action", "text": "Jeanne looks toward d’Aulon. The answer is decided before either speaks."},
                            {"id": "S01-CH04-N03-L110", "type": "dialogue", "text": "We are going.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH04-N03-L120", "type": "dialogue", "text": "Then so are we.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N03-L130", "type": "transition", "text": "CH04-N04 — Compiègne Calls."}
                        ]
                    }
                ]
            },
            {
                "id": "CH04-N04",
                "title": "Compiègne Calls",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Compiègne",
                "time": "23 May 1430 — morning to afternoon",
                "summary": "Jeanne reaches Compiègne with a relatively small force and prepares a sortie against the Burgundian pressure outside the town. MC's group joins as experienced irregulars, not as the operation's commanders.",
                "beats": [
                    {
                        "id": "CH04-N04-BEAT-01",
                        "order": 1,
                        "title": "A Smaller War",
                        "presentation": "story-scene",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "Compiègne defenders"],
                        "screenAction": "Inside Compiègne, preparations are urgent and compact. There is no huge royal army waiting behind Jeanne this time.",
                        "dialogueIntent": "Make the reduced scale visible before the sortie and keep local defenders important.",
                        "playerControl": "dialogue advance",
                        "trigger": "compiegne_reached",
                        "result": "The player understands that the coming action is a risky local sortie with limited support.",
                        "next": "CH04-N04-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N04-L010", "type": "action", "text": "Compiègne's defenders make room for Jeanne's small force without pretending it is the army that came to Orléans."},
                            {"id": "S01-CH04-N04-L020", "type": "dialogue", "text": "We strike the pressure outside the town, then come back before they can close around us.", "speaker": "Jean d’Aulon", "displayLabel": "d’Aulon"},
                            {"id": "S01-CH04-N04-L030", "type": "dialogue", "text": "That sounds like the part people always say before the difficult part.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-N04-L040", "type": "dialogue", "text": "Then remember the second half: come back.", "speaker": "Jean d’Aulon", "displayLabel": "d’Aulon"}
                        ]
                    },
                    {
                        "id": "CH04-N04-BEAT-02",
                        "order": 2,
                        "title": "The Sortie",
                        "presentation": "pre-battle",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "Hangaku Gozen"],
                        "screenAction": "The group crosses out toward the Burgundian positions near Margny with the return route visibly behind them.",
                        "dialogueIntent": "Put the retreat route on screen before it matters so the later failure is legible rather than arbitrary.",
                        "playerControl": "dialogue advance",
                        "trigger": "sortie_ready",
                        "result": "The sortie begins with a clear limited objective and a clear route back to Compiègne.",
                        "next": "CH04-B02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N04-L050", "type": "action", "text": "The fortified crossing and town gate remain visible behind the column as the sortie moves toward Margny."},
                            {"id": "S01-CH04-N04-L060", "type": "dialogue", "text": "We hit them, we make space, we come back through there.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N04-L070", "type": "dialogue", "text": "Exactly. Do not improve the plan after we leave the gate.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-N04-L080", "type": "transition", "text": "CH04-B02 — The Gate at Compiègne."}
                        ]
                    }
                ]
            },
            {
                "id": "CH04-B02",
                "title": "The Gate at Compiègne",
                "type": "battle",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Compiègne / Margny approaches",
                "time": "23 May 1430 — evening",
                "summary": "A sortie against the Burgundian siege pressure turns into a fighting retreat. Jeanne and d’Aulon remain with the rear guard as the route to the fortified crossing is lost. The objective changes honestly from attack to retreat to survival; Jeanne is captured by Burgundian forces connected to John of Luxembourg's command.",
                "beats": [
                    {
                        "id": "CH04-B02-BEAT-01",
                        "order": 1,
                        "title": "Strike and Return",
                        "presentation": "battle-preview",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Compiègne defenders", "Burgundian soldiers"],
                        "screenAction": "The sortie attacks Burgundian pressure near Margny with a limited goal: disrupt the position and return before reinforcements can seal the route.",
                        "dialogueIntent": "Start with an achievable limited objective, not a doomed battle disguised as a normal victory map.",
                        "playerControl": "battle control",
                        "trigger": "compiegne_sortie_begins",
                        "result": "The forward action disrupts the immediate position, but Burgundian reinforcements begin appearing on the flanks.",
                        "next": "CH04-B02-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B02-L010", "type": "control", "text": "Objective: disrupt the Burgundian forward position, then preserve a route back to Compiègne."},
                            {"id": "S01-CH04-B02-L020", "type": "action", "text": "The first Burgundian line gives ground, but movement appears beyond the flank where the sortie did not expect another full body of troops."},
                            {"id": "S01-CH04-B02-L030", "type": "dialogue", "text": "That is enough. Back to the town before this becomes their battle.", "speaker": "Jean d’Aulon", "displayLabel": "d’Aulon"}
                        ]
                    },
                    {
                        "id": "CH04-B02-BEAT-02",
                        "order": 2,
                        "title": "The Retreat Narrows",
                        "presentation": "battle-event",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "Burgundian soldiers"],
                        "screenAction": "Reinforcements press the sortie back. Jeanne and d’Aulon remain near the rear while other units stream toward the fortified crossing.",
                        "dialogueIntent": "Make the capture emerge from a collapsing retreat, not from a cutscene that ignores a successful map objective.",
                        "playerControl": "battle control",
                        "trigger": "burgundian_reinforcements_arrive",
                        "result": "The offensive objective is abandoned and the player must preserve the withdrawal corridor.",
                        "next": "CH04-B02-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B02-L040", "type": "control", "text": "Objective changes: RETREAT TO COMPIÈGNE. Keep the route open for the withdrawing force."},
                            {"id": "S01-CH04-B02-L050", "type": "dialogue", "text": "Go! I am behind you!", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH04-B02-L060", "type": "dialogue", "text": "That sentence has never made me feel better.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-B02-L070", "type": "action", "text": "The retreat compresses toward the fortified crossing while Burgundian troops press between scattered rear groups."}
                        ]
                    },
                    {
                        "id": "CH04-B02-BEAT-03",
                        "order": 3,
                        "title": "Cut Off",
                        "presentation": "battle-event",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "Burgundian soldiers"],
                        "screenAction": "The rear guard loses practical access to the crossing. MC tries to reach Jeanne, but Burgundian troops split the field and the available path closes faster than the party can reopen it.",
                        "dialogueIntent": "The player is allowed to try. The game then states plainly when the rescue route is no longer achievable in this encounter.",
                        "playerControl": "battle control / rescue attempt",
                        "trigger": "retreat_route_severed",
                        "result": "Jeanne and d’Aulon are isolated with a small rear group; MC's side is forced away from the capture point.",
                        "next": "CH04-B02-BEAT-04",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B02-L080", "type": "control", "text": "Objective changes: REACH JEANNE. A rescue route is still visible but collapsing."},
                            {"id": "S01-CH04-B02-L090", "type": "action", "text": "A fresh Burgundian push cuts across the last open lane between MC and the rear guard."},
                            {"id": "S01-CH04-B02-L100", "type": "dialogue", "text": "Jeanne!", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-B02-L110", "type": "action", "text": "Jeanne turns once, still fighting toward the crossing with d’Aulon close beside her. The distance grows instead of shrinking."},
                            {"id": "S01-CH04-B02-L120", "type": "control", "text": "Rescue route lost. Objective changes: WITHDRAW SURVIVORS. The encounter no longer presents Jeanne's extraction as achievable."}
                        ]
                    },
                    {
                        "id": "CH04-B02-BEAT-04",
                        "order": 4,
                        "title": "The Maid Taken",
                        "presentation": "battle-aftermath",
                        "characters": ["MC", "Jeanne d’Arc", "Jean d’Aulon", "Julie d’Aubigny", "Burgundian soldiers"],
                        "screenAction": "From beyond the severed route, MC sees Jeanne pulled from her horse and taken. d’Aulon is captured with the remaining rear group. The surviving party must leave before it is surrounded as well.",
                        "dialogueIntent": "End on an earned failure state. John of Luxembourg enters through the custody chain, not as a theatrical personal captor.",
                        "playerControl": "withdrawal control / dialogue advance",
                        "trigger": "jeanne_capture_committed",
                        "result": "Jeanne and d’Aulon are prisoners; MC's party survives outside the capture and can begin tracking where they are taken.",
                        "next": "CH04-N06",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-B02-L130", "type": "action", "text": "Across the broken retreat, Burgundian soldiers drag Jeanne from her horse and close around the remaining rear guard. d’Aulon disappears into the same knot of prisoners."},
                            {"id": "S01-CH04-B02-L140", "type": "dialogue", "text": "We cannot reach her from here.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-B02-L150", "type": "dialogue", "text": "Then we find where they take her.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-B02-L160", "type": "control", "text": "Complete the withdrawal with surviving required units. No victory banner is shown for Jeanne's capture."},
                            {"id": "S01-CH04-B02-L170", "type": "transition", "text": "CH04-N06 — Taken."}
                        ]
                    }
                ]
            },
            {
                "id": "CH04-N06",
                "title": "Taken",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Road south of Compiègne",
                "time": "Night, 23 May 1430",
                "summary": "The survivors learn that Jeanne has entered the Burgundian custody chain associated with John of Luxembourg. An immediate battlefield rescue is no longer possible, so the chapter turns from campaigning to tracking a prisoner.",
                "beats": [
                    {
                        "id": "CH04-N06-BEAT-01",
                        "order": 1,
                        "title": "No Victory Screen",
                        "presentation": "aftermath",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante", "Survivors"],
                        "screenAction": "The survivors regroup far enough from Compiègne to stop running. Nobody celebrates surviving the map.",
                        "dialogueIntent": "Let the failure remain emotionally and mechanically legible.",
                        "playerControl": "dialogue advance",
                        "trigger": "compiegne_withdrawal_complete",
                        "result": "MC accepts that the immediate battle is over and that a different kind of pursuit must begin.",
                        "next": "CH04-N06-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N06-L010", "type": "action", "text": "The group stops only when Compiègne's bells are too far away to hear clearly."},
                            {"id": "S01-CH04-N06-L020", "type": "dialogue", "text": "We left her.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N06-L030", "type": "dialogue", "text": "We were cut away from her. Those are not the same words.", "speaker": "Hangaku Gozen", "displayLabel": "Hangaku Gozen"},
                            {"id": "S01-CH04-N06-L040", "type": "dialogue", "text": "They feel the same right now.", "speaker": "MC", "displayLabel": "MC"}
                        ]
                    },
                    {
                        "id": "CH04-N06-BEAT-02",
                        "order": 2,
                        "title": "Follow the Prisoner",
                        "presentation": "chapter-end",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Messenger"],
                        "screenAction": "A report identifies Jeanne as a high-value Burgundian prisoner associated with John of Luxembourg's forces. MC stops thinking in terms of rejoining the campaign and starts thinking in terms of finding her.",
                        "dialogueIntent": "Turn the saga from campaign adventure into personal rescue pressure without pretending the party can immediately storm the captors.",
                        "playerControl": "dialogue advance",
                        "trigger": "custody_report_arrives",
                        "result": "Chapter 4 ends with Jeanne captive, d’Aulon also taken, and MC's group committed to tracking the custody chain.",
                        "next": "CH05",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH04-N06-L050", "type": "dialogue", "text": "The Burgundians are moving the Maid under guard. Luxembourg's people have custody.", "speaker": "Messenger", "displayLabel": "Messenger"},
                            {"id": "S01-CH04-N06-L060", "type": "dialogue", "text": "Where?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH04-N06-L070", "type": "dialogue", "text": "Not somewhere we can reach tonight.", "speaker": "Messenger", "displayLabel": "Messenger"},
                            {"id": "S01-CH04-N06-L080", "type": "dialogue", "text": "Then tomorrow starts with finding out where.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH04-N06-L090", "type": "narration", "text": "CHAPTER 4 COMPLETE"},
                            {"id": "S01-CH04-N06-L100", "type": "transition", "text": "Next: Chapter 5 — Rouen."}
                        ]
                    }
                ]
            }
        ]
    }


def chapter5():
    return {
        "id": "CH05",
        "title": "Rouen",
        "status": "draft",
        "nodes": [
            {
                "id": "CH05-N01",
                "title": "The Prisoner's Road",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Northern France",
                "time": "Summer–December 1430",
                "summary": "Months of rumor and paid information replace battlefield maps. Jeanne remains in Burgundian custody before being transferred to the English for a large payment and brought to Rouen. MC's party follows the chain rather than inventing an army that can simply take her back.",
                "beats": [
                    {
                        "id": "CH05-N01-BEAT-01",
                        "order": 1,
                        "title": "A Moving Prison",
                        "presentation": "investigation",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Informants"],
                        "screenAction": "The party tracks contradictory reports as Jeanne is moved through Burgundian custody. Leads arrive late, routes change, and every castle rumor is already old by the time they reach it.",
                        "dialogueIntent": "Replace open-field campaign certainty with frustrating information work.",
                        "playerControl": "dialogue advance",
                        "trigger": "chapter_start",
                        "result": "The party learns that direct pursuit is failing and begins following the political custody chain instead.",
                        "next": "CH05-N01-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N01-L010", "type": "narration", "text": "Summer 1430"},
                            {"id": "S01-CH05-N01-L020", "type": "action", "text": "A map fills with names that mean very little by the time the party reaches them. Jeanne is moved faster than reliable news."},
                            {"id": "S01-CH05-N01-L030", "type": "dialogue", "text": "Every answer is two days old.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N01-L040", "type": "dialogue", "text": "Then stop chasing the last door she passed through. Find who decides the next one.", "speaker": "Hangaku Gozen", "displayLabel": "Hangaku Gozen"}
                        ]
                    },
                    {
                        "id": "CH05-N01-BEAT-02",
                        "order": 2,
                        "title": "Sold to the English",
                        "presentation": "story-scene",
                        "characters": ["MC", "Julie d’Aubigny", "Informant"],
                        "screenAction": "The party confirms that the English have acquired Jeanne from the Burgundian custody chain for a large ransom-equivalent payment and are taking her toward Rouen.",
                        "dialogueIntent": "Keep John of Luxembourg and the transfer political and transactional rather than melodramatic personal villainy.",
                        "playerControl": "dialogue advance",
                        "trigger": "english_transfer_confirmed",
                        "result": "Rouen becomes the fixed destination and the first reliable place where the party can plan ahead of the prisoner rather than behind her.",
                        "next": "CH05-N01-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N01-L050", "type": "dialogue", "text": "Luxembourg's custody is ending. The English paid for her transfer.", "speaker": "Informant", "displayLabel": "Informant"},
                            {"id": "S01-CH05-N01-L060", "type": "dialogue", "text": "You can buy a person?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N01-L070", "type": "dialogue", "text": "You can call it ransom, transfer, custody, law, politics. She still ends up behind another locked door.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N01-L080", "type": "dialogue", "text": "Where?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N01-L090", "type": "dialogue", "text": "Rouen.", "speaker": "Informant", "displayLabel": "Informant"}
                        ]
                    },
                    {
                        "id": "CH05-N01-BEAT-03",
                        "order": 3,
                        "title": "No Army This Time",
                        "presentation": "transition",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante"],
                        "screenAction": "The group reduces what it carries and plans for a hostile city controlled by the English. A marching army would end the attempt before it starts.",
                        "dialogueIntent": "Make the genre shift explicit: information, access, and escape routes matter more than battlefield strength.",
                        "playerControl": "dialogue advance",
                        "trigger": "rouen_destination_known",
                        "result": "The party approaches Rouen as a small covert group rather than as a formal French force.",
                        "next": "CH05-B01",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N01-L100", "type": "dialogue", "text": "So what is the plan?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N01-L110", "type": "dialogue", "text": "For once? Do not arrive looking like an army.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N01-L120", "type": "transition", "text": "CH05-B01 — A Road into Rouen."}
                        ]
                    }
                ]
            },
            {
                "id": "CH05-B01",
                "title": "A Road into Rouen",
                "type": "battle",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Road and river approaches outside Rouen",
                "time": "January 1431",
                "summary": "Fantasia fictional adaptation: the party escorts a local contact carrying legitimate trade papers through a patrol sweep so they can enter Rouen without inventing a recorded historical rescue battle. The objective is access and survival, not defeating the English garrison.",
                "beats": [
                    {
                        "id": "CH05-B01-BEAT-01",
                        "order": 1,
                        "title": "The Papers Matter More",
                        "presentation": "battle-preview",
                        "characters": ["MC", "Julie d’Aubigny", "Local Contact", "English patrol"],
                        "screenAction": "A local contact has papers that can place part of the group inside Rouen, but a patrol sweep closes across the approach before they reach the gate traffic.",
                        "dialogueIntent": "Frame the fictional operation around access. Killing the patrol is neither necessary nor desirable.",
                        "playerControl": "battle control",
                        "trigger": "rouen_contact_intercepted",
                        "result": "The party protects the contact and identifies a route around the patrol's main cordon.",
                        "next": "CH05-B01-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-B01-L010", "type": "control", "text": "Fantasia adaptation. Objective: protect the contact and reach the trade road without raising a full alarm."},
                            {"id": "S01-CH05-B01-L020", "type": "dialogue", "text": "If those papers tear, we get to explain ourselves to every guard in Rouen.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-B01-L030", "type": "dialogue", "text": "So for once the paper is the important fighter.", "speaker": "MC", "displayLabel": "MC"}
                        ]
                    },
                    {
                        "id": "CH05-B01-BEAT-02",
                        "order": 2,
                        "title": "Break Contact",
                        "presentation": "escape-gameplay",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Local Contact", "English patrol"],
                        "screenAction": "The group uses terrain and traffic to separate from the patrol instead of turning the approach into an open battle that would close the city to them.",
                        "dialogueIntent": "Reward restraint and route control, fitting the smaller Rouen chapter scale.",
                        "playerControl": "battle control / escape",
                        "trigger": "trade_route_reached",
                        "result": "The patrol loses a clean line on the group and the contact keeps the gate approach viable.",
                        "next": "CH05-B01-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-B01-L040", "type": "control", "text": "Objective update: BREAK CONTACT. Reach the marked route with the contact; unnecessary pursuit risks locking the party out of Rouen."},
                            {"id": "S01-CH05-B01-L050", "type": "action", "text": "Hangaku pins the patrol behind cover long enough for carts and pedestrians to close the sightline."},
                            {"id": "S01-CH05-B01-L060", "type": "dialogue", "text": "Move. Being memorable is the opposite of the plan.", "speaker": "Hangaku Gozen", "displayLabel": "Hangaku Gozen"}
                        ]
                    },
                    {
                        "id": "CH05-B01-BEAT-03",
                        "order": 3,
                        "title": "Inside",
                        "presentation": "post-battle",
                        "characters": ["MC", "Julie d’Aubigny", "Local Contact"],
                        "screenAction": "The papers and contact get part of the group through ordinary gate traffic. Weapons are concealed or left with the outer support team as planned.",
                        "dialogueIntent": "End with access gained, not an implausible military victory over Rouen.",
                        "playerControl": "dialogue advance",
                        "trigger": "rouen_entry_secured",
                        "result": "The party establishes a small covert presence inside Rouen and can begin observing the prison and trial structure.",
                        "next": "CH05-N03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-B01-L070", "type": "action", "text": "The gate closes behind a cart. MC is already inside the city when the patrol finally reaches the road outside."},
                            {"id": "S01-CH05-B01-L080", "type": "dialogue", "text": "I prefer battles where the enemy does not know we won anything.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-B01-L090", "type": "transition", "text": "CH05-N03 — Rouen."}
                        ]
                    }
                ]
            },
            {
                "id": "CH05-N03",
                "title": "Rouen",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Rouen",
                "time": "January–February 1431",
                "summary": "The party discovers the basic structure they are actually fighting: Jeanne is held in the English castle under military guard while Pierre Cauchon directs the ecclesiastical proceedings. Warwick matters as the English castle/security authority; Bedford's larger regime is background rather than a mandatory personal meeting.",
                "beats": [
                    {
                        "id": "CH05-N03-BEAT-01",
                        "order": 1,
                        "title": "The Castle",
                        "presentation": "investigation",
                        "characters": ["MC", "Julie d’Aubigny", "Local Contact", "English soldiers"],
                        "screenAction": "The group maps ordinary traffic around the English castle and learns that Jeanne is held under English military guard rather than in a normal church prison.",
                        "dialogueIntent": "Make the physical rescue problem concrete before the trial scenes begin.",
                        "playerControl": "dialogue advance",
                        "trigger": "rouen_safehouse_established",
                        "result": "The party identifies the castle as the custody site and understands why a simple prison break is difficult.",
                        "next": "CH05-N03-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N03-L010", "type": "action", "text": "From a rented upper room, the party watches shifts change around the English castle and writes down nothing that would survive a search."},
                            {"id": "S01-CH05-N03-L020", "type": "dialogue", "text": "Military guards. Castle doors. Controlled visitors. That is not an ordinary church prison.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N03-L030", "type": "dialogue", "text": "Can we reach her?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N03-L040", "type": "dialogue", "text": "Eventually is not the same answer as safely.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"}
                        ]
                    },
                    {
                        "id": "CH05-N03-BEAT-02",
                        "order": 2,
                        "title": "The Trial Has a Shape",
                        "presentation": "story-scene",
                        "characters": ["MC", "Pierre Cauchon", "Richard Beauchamp, Earl of Warwick", "Clerks", "English soldiers"],
                        "screenAction": "Through public movement and overheard official business, the party identifies Pierre Cauchon as the bishop directing the case and Warwick as a major English authority over the castle environment. They do not gain private access to either man.",
                        "dialogueIntent": "Introduce only the named authorities needed for the next conflict; avoid a villain roll-call.",
                        "playerControl": "dialogue advance",
                        "trigger": "trial_authority_identified",
                        "result": "The party separates judicial pressure from military custody and realizes disrupting one does not automatically solve the other.",
                        "next": "CH05-N04",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N03-L050", "type": "action", "text": "Clerks move between the castle and church offices under guard. The same two names recur in different conversations: Cauchon for the case, Warwick for the English castle authority around it."},
                            {"id": "S01-CH05-N03-L060", "type": "dialogue", "text": "So even if the trial stopped, the soldiers would still have her.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N03-L070", "type": "dialogue", "text": "And opening a cell does not make the city gates disappear.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N03-L080", "type": "transition", "text": "CH05-N04 — Questions and Chains."}
                        ]
                    }
                ]
            },
            {
                "id": "CH05-N04",
                "title": "Questions and Chains",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Rouen Castle",
                "time": "21 February 1431 onward",
                "summary": "Jeanne's public examinations begin on 21 February under Cauchon's authority. The story presents the pressure of questioning, custody, and isolation without translating her religious claims into Fracture cosmology.",
                "beats": [
                    {
                        "id": "CH05-N04-BEAT-01",
                        "order": 1,
                        "title": "First Public Examination",
                        "presentation": "historical-scene",
                        "characters": ["Jeanne d’Arc", "Pierre Cauchon", "Clerks", "Assessors"],
                        "screenAction": "On 21 February Jeanne is brought before Cauchon and a large body of assessors in the castle chapel. The scene focuses on pressure, procedure, and Jeanne's refusal to hand over every private conviction on demand.",
                        "dialogueIntent": "Preserve religious ambiguity. Her voices are her claims and faith experience; the narrative does not re-label them as Fracture messages.",
                        "playerControl": "dialogue advance",
                        "trigger": "public_examination_begins",
                        "result": "The player sees the trial as an escalating institutional danger separate from the physical prison problem.",
                        "next": "CH05-N04-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N04-L010", "type": "narration", "text": "Rouen Castle — 21 February 1431"},
                            {"id": "S01-CH05-N04-L020", "type": "action", "text": "Jeanne stands before Cauchon, clerks, and rows of assessors in the royal chapel. Every answer is being written down."},
                            {"id": "S01-CH05-N04-L030", "type": "dialogue", "text": "You will swear to answer truthfully to what is asked of you.", "speaker": "Pierre Cauchon", "displayLabel": "Cauchon"},
                            {"id": "S01-CH05-N04-L040", "type": "dialogue", "text": "I will tell the truth about what concerns me. There are things I will not tell you.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH05-N04-L050", "type": "action", "text": "The clerks continue writing. The questioning does not end with one refusal."}
                        ]
                    },
                    {
                        "id": "CH05-N04-BEAT-02",
                        "order": 2,
                        "title": "Outside the Room",
                        "presentation": "investigation",
                        "characters": ["MC", "Julie d’Aubigny", "Local Contact"],
                        "screenAction": "MC cannot simply attend every proceeding. The group reconstructs what it can from public sessions, clerks, servants, guards, and city rumor while continuing to study prison access.",
                        "dialogueIntent": "Keep MC's access earned and partial. The historical trial remains larger than the protagonist's viewpoint.",
                        "playerControl": "dialogue advance",
                        "trigger": "trial_pressure_known",
                        "result": "The party finds one fragile service route that may allow a brief covert meeting but not a full extraction.",
                        "next": "CH05-N05",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N04-L060", "type": "dialogue", "text": "We know when food moves. We know when two guard shifts overlap badly. That is not enough for a rescue.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N04-L070", "type": "dialogue", "text": "Is it enough to see her?", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N04-L080", "type": "dialogue", "text": "Once. Briefly. If nobody gets ambitious.", "speaker": "Local Contact", "displayLabel": "Local Contact"},
                            {"id": "S01-CH05-N04-L090", "type": "dialogue", "text": "That warning feels targeted.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N04-L100", "type": "transition", "text": "CH05-N05 — Through the Bars."}
                        ]
                    }
                ]
            },
            {
                "id": "CH05-N05",
                "title": "Through the Bars",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Rouen Castle — service corridor near Jeanne's cell",
                "time": "Spring 1431",
                "summary": "Fantasia fictional adaptation: using a narrow service-access opportunity, MC reaches Jeanne for a brief covert reunion. The meeting gives no magical answer and no easy rescue; Jeanne is exhausted, guarded, and still capable of making her own choices.",
                "beats": [
                    {
                        "id": "CH05-N05-BEAT-01",
                        "order": 1,
                        "title": "One Minute Too Long",
                        "presentation": "infiltration-scene",
                        "characters": ["MC", "Julie d’Aubigny", "Local Contact", "English guards"],
                        "screenAction": "The party uses a service movement window to place MC near Jeanne's cell while Julie watches the corridor. The route is too exposed to move a prisoner through it.",
                        "dialogueIntent": "Make the reunion costly and limited before it becomes emotional.",
                        "playerControl": "dialogue advance",
                        "trigger": "service_route_open",
                        "result": "MC reaches speaking distance of Jeanne but has no viable extraction path.",
                        "next": "CH05-N05-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N05-L010", "type": "control", "text": "Fantasia adaptation. This covert meeting is fictional connective story, not a claim of a recorded historical prison visit."},
                            {"id": "S01-CH05-N05-L020", "type": "action", "text": "A service door closes behind MC. Julie remains at the corner where she can see the guard route but not Jeanne's cell."},
                            {"id": "S01-CH05-N05-L030", "type": "dialogue", "text": "One minute. Two if every guard in Rouen suddenly becomes stupid.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"}
                        ]
                    },
                    {
                        "id": "CH05-N05-BEAT-02",
                        "order": 2,
                        "title": "Still Jeanne",
                        "presentation": "character-scene",
                        "characters": ["MC", "Jeanne d’Arc"],
                        "screenAction": "MC and Jeanne see each other through the secured cell boundary. Jeanne is worn down by confinement and questioning but refuses to become a passive object in MC's rescue fantasy.",
                        "dialogueIntent": "Reunite them as friends. Jeanne can be afraid and tired while still retaining agency, faith, and judgment.",
                        "playerControl": "dialogue advance",
                        "trigger": "mc_reaches_jeanne",
                        "result": "MC promises to keep looking for a real way out; Jeanne makes MC promise not to throw away everyone else on an impossible rush.",
                        "next": "CH05-N05-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N05-L040", "type": "dialogue", "text": "{{MC_NAME}}?", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH05-N05-L050", "type": "dialogue", "text": "Yes.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N05-L060", "type": "dialogue", "text": "You look terrible.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N05-L070", "type": "dialogue", "text": "You crossed half of France to tell me that?", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH05-N05-L080", "type": "dialogue", "text": "No. I came to get you out.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N05-L090", "type": "dialogue", "text": "Then find a road that does not kill everyone who follows you through it.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"},
                            {"id": "S01-CH05-N05-L100", "type": "dialogue", "text": "I will.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N05-L110", "type": "dialogue", "text": "Good. And do not let them turn what I believe into whatever story is easiest for them.", "speaker": "Jeanne d’Arc", "displayLabel": "Jeanne"}
                        ]
                    },
                    {
                        "id": "CH05-N05-BEAT-03",
                        "order": 3,
                        "title": "The Door Closes",
                        "presentation": "transition",
                        "characters": ["MC", "Julie d’Aubigny", "English guards"],
                        "screenAction": "The guard rhythm changes early and the group abandons the service route before it is exposed. The meeting proves Jeanne is reachable, but not yet extractable.",
                        "dialogueIntent": "End with a concrete problem to solve rather than false hope.",
                        "playerControl": "dialogue advance",
                        "trigger": "guard_route_changes",
                        "result": "The party begins planning a more dangerous extraction attempt while the trial continues.",
                        "next": "CH05-B02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N05-L120", "type": "action", "text": "A bootstep sounds where the contact said there should be none. Julie signals once."},
                            {"id": "S01-CH05-N05-L130", "type": "dialogue", "text": "Time.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N05-L140", "type": "action", "text": "MC leaves before the corridor can become a trap. The cell door never opened."},
                            {"id": "S01-CH05-N05-L150", "type": "transition", "text": "CH05-B02 — The Failed Extraction."}
                        ]
                    }
                ]
            },
            {
                "id": "CH05-B02",
                "title": "The Failed Extraction",
                "type": "battle",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Rouen Castle service approaches",
                "time": "29 May 1431 — night",
                "summary": "Fantasia fictional adaptation: with Jeanne's danger now immediate, the party attempts a limited extraction through a mapped service route. Security closes faster than expected; the attempt fails causally and the objective changes to preserving the surviving rescue team and its final outside route rather than pretending Jeanne was freed.",
                "beats": [
                    {
                        "id": "CH05-B02-BEAT-01",
                        "order": 1,
                        "title": "Reach the Inner Route",
                        "presentation": "battle-preview",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante", "English guards"],
                        "screenAction": "The party enters through the one service route it has mapped and tries to reach the inner corridor before the next guard rotation.",
                        "dialogueIntent": "Treat this as a desperate covert extraction, not an invented siege of Rouen Castle.",
                        "playerControl": "battle control",
                        "trigger": "extraction_attempt_begins",
                        "result": "The team reaches the inner approach but discovers that security has tightened beyond the earlier pattern.",
                        "next": "CH05-B02-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-B02-L010", "type": "control", "text": "Fantasia adaptation. Objective: reach the inner service corridor before the guard rotation closes."},
                            {"id": "S01-CH05-B02-L020", "type": "dialogue", "text": "Same path as before. Faster. Quieter.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-B02-L030", "type": "dialogue", "text": "Those requirements are fighting each other.", "speaker": "MC", "displayLabel": "MC"}
                        ]
                    },
                    {
                        "id": "CH05-B02-BEAT-02",
                        "order": 2,
                        "title": "The Route Is Gone",
                        "presentation": "battle-event",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante", "English guards"],
                        "screenAction": "A reinforced guard movement seals the corridor needed to reach Jeanne's cell, while another patrol begins closing the route behind the party.",
                        "dialogueIntent": "Fail the extraction because the physical route becomes untenable, not because a cutscene arbitrarily cancels a successful objective.",
                        "playerControl": "battle control",
                        "trigger": "inner_corridor_sealed",
                        "result": "Jeanne's cell is no longer reachable in this attempt and the rescue team risks being trapped inside the castle.",
                        "next": "CH05-B02-BEAT-03",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-B02-L040", "type": "action", "text": "A reinforced guard group takes the inner turn before the party reaches it. A second lantern line appears behind them."},
                            {"id": "S01-CH05-B02-L050", "type": "dialogue", "text": "We can force that door.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-B02-L060", "type": "dialogue", "text": "And then fight the castle with nowhere to take her. No.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-B02-L070", "type": "control", "text": "Extraction route failed. Objective changes: WITHDRAW. Preserve the team and the outside support route."}
                        ]
                    },
                    {
                        "id": "CH05-B02-BEAT-03",
                        "order": 3,
                        "title": "Leave Before the Gates Close",
                        "presentation": "escape-gameplay",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante", "English guards"],
                        "screenAction": "The party fights only enough to reopen its exit and breaks away before a full castle alarm traps everyone inside Rouen.",
                        "dialogueIntent": "The attempt fails, but preserving the rescue team leaves one final desperate option for the next chapter.",
                        "playerControl": "battle control / withdrawal",
                        "trigger": "withdrawal_ordered",
                        "result": "The party escapes without Jeanne. Its covert prison route is burned and ordinary extraction plans are exhausted.",
                        "next": "CH05-N07",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-B02-L080", "type": "control", "text": "Objective: reach the outer safe point with all required rescue-team units."},
                            {"id": "S01-CH05-B02-L090", "type": "action", "text": "Hangaku covers the last crossing while Bradamante forces a blocked service gate just far enough for the group to pass."},
                            {"id": "S01-CH05-B02-L100", "type": "dialogue", "text": "She is still in there.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-B02-L110", "type": "dialogue", "text": "Yes. And if we stay, so are we.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-B02-L120", "type": "transition", "text": "CH05-N07 — Thirty May."}
                        ]
                    }
                ]
            },
            {
                "id": "CH05-N07",
                "title": "Thirty May",
                "type": "story",
                "status": "draft",
                "scriptStatus": "draft",
                "location": "Rouen",
                "time": "30 May 1431 — dawn",
                "summary": "The party learns that Jeanne is to be taken to the Vieux-Marché that morning. The prison route is gone and ordinary rescue planning has failed. Chapter 5 ends before the stake rescue itself, handing the final attempt and First Manifestation to the Finale.",
                "beats": [
                    {
                        "id": "CH05-N07-BEAT-01",
                        "order": 1,
                        "title": "No More Time",
                        "presentation": "story-scene",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante", "Local Contact"],
                        "screenAction": "Before sunrise the contact brings the news the party feared: Jeanne is to be taken out for execution that morning.",
                        "dialogueIntent": "Collapse the remaining timetable without beginning the Finale early.",
                        "playerControl": "dialogue advance",
                        "trigger": "execution_transfer_confirmed",
                        "result": "The group understands that there will be no second prison extraction attempt.",
                        "next": "CH05-N07-BEAT-02",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N07-L010", "type": "narration", "text": "Rouen — 30 May 1431, before dawn"},
                            {"id": "S01-CH05-N07-L020", "type": "dialogue", "text": "They are moving her this morning. Vieux-Marché.", "speaker": "Local Contact", "displayLabel": "Local Contact"},
                            {"id": "S01-CH05-N07-L030", "type": "action", "text": "Nobody asks what the sentence means. They all know."},
                            {"id": "S01-CH05-N07-L040", "type": "dialogue", "text": "Our prison route is finished.", "speaker": "Hangaku Gozen", "displayLabel": "Hangaku Gozen"},
                            {"id": "S01-CH05-N07-L050", "type": "dialogue", "text": "Then we stop planning for the prison.", "speaker": "MC", "displayLabel": "MC"}
                        ]
                    },
                    {
                        "id": "CH05-N07-BEAT-02",
                        "order": 2,
                        "title": "One Last Attempt",
                        "presentation": "chapter-end",
                        "characters": ["MC", "Julie d’Aubigny", "Hangaku Gozen", "Bradamante"],
                        "screenAction": "The group abandons every remaining assumption about a clean extraction and prepares to intercept the execution movement itself. The scene ends before they reach Jeanne or the stake.",
                        "dialogueIntent": "Hand cleanly into the Finale. Do not reveal the First Manifestation or resolve Jeanne's expected death here.",
                        "playerControl": "dialogue advance",
                        "trigger": "final_rescue_decision",
                        "result": "Chapter 5 ends with the final rescue attempt beginning; the First Manifestation remains unrevealed.",
                        "next": "FIN",
                        "scriptStatus": "draft",
                        "script": [
                            {"id": "S01-CH05-N07-L060", "type": "dialogue", "text": "This is not a good plan.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N07-L070", "type": "dialogue", "text": "No.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N07-L080", "type": "dialogue", "text": "Just checking.", "speaker": "Julie d’Aubigny", "displayLabel": "Julie"},
                            {"id": "S01-CH05-N07-L090", "type": "dialogue", "text": "We reach her. We free her. Then we find a way out.", "speaker": "MC", "displayLabel": "MC"},
                            {"id": "S01-CH05-N07-L100", "type": "action", "text": "Julie checks her sword. Hangaku tightens her bowstring. Bradamante lifts her lance. Dawn begins to reach the rooftops."},
                            {"id": "S01-CH05-N07-L110", "type": "narration", "text": "CHAPTER 5 COMPLETE"},
                            {"id": "S01-CH05-N07-L120", "type": "transition", "text": "Next: Finale — The First Manifestation."}
                        ]
                    }
                ]
            }
        ]
    }


# Replace any retry copy if the script is re-run, then append CH04/CH05.
saga["chapters"] = [c for c in saga["chapters"] if c["id"] not in {"CH04", "CH05"}]
saga["chapters"].extend([chapter4(), chapter5()])

# Build non-canonical production-preview metadata directly from the new canonical beats.
for chapter in saga["chapters"]:
    if chapter["id"] not in {"CH04", "CH05"}:
        continue
    for node in chapter["nodes"]:
        for beat in node["beats"]:
            chars = beat.get("characters", [])[:3]
            slot_names = ["left", "center", "right"]
            slots = {}
            for slot_name, character in zip(slot_names, chars):
                initials = "".join(part[0] for part in character.replace("d’", "").replace("d'", "").split() if part)[:3].upper() or "?"
                slots[slot_name] = {"character": character, "shortLabel": initials, "pose": "active"}
            player_mode = node["type"] == "battle" and beat["presentation"] in {
                "battle-preview",
                "battle-event",
                "escape-gameplay",
            }
            timing = (
                {"mode": "player", "minSeconds": 25, "maxSeconds": 150}
                if player_mode
                else {"mode": "advance", "estimatedSeconds": max(16, min(40, len(beat.get("script", [])) * 4))}
            )
            production["beats"][beat["id"]] = {
                "timing": timing,
                "staging": {
                    "background": node.get("location", node["title"]),
                    "camera": "Tactical overview → event focus" if node["type"] == "battle" else "Scene framing → character focus",
                    "slots": slots,
                },
                "events": [
                    {"type": "action", "text": beat["screenAction"]},
                    {"type": "dialogue", "text": beat["dialogueIntent"]},
                    {"type": "transition", "text": f"Continue to {beat['next']}."},
                ],
            }

STORY_PATH.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n")
PRODUCTION_PATH.write_text(json.dumps(production, ensure_ascii=False, indent=2) + "\n")
