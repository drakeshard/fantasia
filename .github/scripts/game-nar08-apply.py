import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STORY = ROOT / "content/narrative/story.json"
PROD = ROOT / "content/narrative/story-production.json"
INDEX = ROOT / "apps/story-studio/src/index.html"


def ev(node, n, kind, text, speaker=None, label=None):
    item = {"id": f"S01-{node}-L{n:03d}", "type": kind, "text": text}
    if kind in {"dialogue", "thought"}:
        item["speaker"] = speaker
        item["displayLabel"] = label or speaker
    return item


def beat(id_, order, title, presentation, characters, action, intent, control, trigger, result, next_, script):
    return {
        "id": id_, "order": order, "title": title, "presentation": presentation,
        "characters": characters, "screenAction": action, "dialogueIntent": intent,
        "playerControl": control, "trigger": trigger, "result": result, "next": next_,
        "scriptStatus": "draft", "script": script,
    }


def node(id_, title, kind, summary, beats, location=None, time=None):
    out = {"id": id_, "title": title, "type": kind, "status": "draft", "scriptStatus": "draft"}
    if location: out["location"] = location
    if time: out["time"] = time
    out["summary"] = summary
    out["beats"] = beats
    return out


ch02_nodes = []

ch02_nodes.append(node(
    "CH02-N01", "Behind the Walls", "story",
    "MC reaches Orléans as part of La Hire's road group, but remains an unranked outsider. The group is given practical work among supplies, wounded, and messengers while Dunois remains a distant command figure.",
    [beat(
        "CH02-N01-BEAT-01", 1, "Useful Hands", "story-scene",
        ["MC", "Julie d’Aubigny", "Hangaku Gozen", "La Hire", "Jean de Dunois"],
        "The road group enters a city under siege. La Hire reports briefly to Dunois while MC, Julie, and Hangaku are directed toward supply and casualty work rather than the command table.",
        "Establish social distance. Dunois notices the group only as people La Hire brought in; MC has no rank, invitation, or automatic access.",
        "dialogue advance", "chapter_start",
        "MC is inside Orléans and useful, but still outside the command circle.", "CH02-N02",
        [
            ev("CH02-N01",10,"action","Orléans is loud with carts, bells, repairs, wounded soldiers, and people arguing over food."),
            ev("CH02-N01",20,"dialogue","This is what everyone was trying to reach?","MC","MC"),
            ev("CH02-N01",30,"dialogue","This is what is still standing.","La Hire","La Hire"),
            ev("CH02-N01",40,"action","Across the square, Dunois takes La Hire's report without stopping the orders already leaving his hands."),
            ev("CH02-N01",50,"dialogue","Your road people can help the quartermasters. If they can carry, bind, count, or run messages, use them.","Jean de Dunois","Dunois"),
            ev("CH02-N01",60,"dialogue","He did not even ask who we are.","MC","MC"),
            ev("CH02-N01",70,"dialogue","He has a city to keep alive. Give him a reason to remember later.","Julie d’Aubigny","Julie"),
            ev("CH02-N01",80,"transition","CH02-N02 — The Maid Enters Orléans."),
        ],
    )], "Orléans", "29 April 1429 — afternoon"
))

ch02_nodes.append(node(
    "CH02-N02", "The Maid Enters Orléans", "story",
    "Jeanne enters Orléans as a distant public symbol. MC sees the city's hope gather around a tired young woman but does not meet her personally.",
    [beat(
        "CH02-N02-BEAT-01",1,"The Maid","cinematic",
        ["MC","Julie d’Aubigny","Hangaku Gozen","Jeanne d’Arc","Civilians"],
        "Crowds gather around Jeanne's entry. MC catches only fragments of her through banners and people.",
        "Keep Jeanne distant, human, and burdened by public hope. No private protagonist access yet.",
        "dialogue advance","maid_arrival",
        "MC understands why the Maid rumor mattered, but Jeanne remains someone seen from the crowd.","CH02-B00",
        [
            ev("CH02-N02",10,"action","A wave of shouting rolls down the street before MC can see its cause."),
            ev("CH02-N02",20,"dialogue","What happened?","MC","MC"),
            ev("CH02-N02",30,"dialogue","She made it into the city.","Civilian","Civilian"),
            ev("CH02-N02",40,"action","A white banner rises above the crowd. Beneath it rides a young armored woman, visibly tired and trying to acknowledge everyone at once."),
            ev("CH02-N02",50,"dialogue","They look at her like the siege is already over.","Julie d’Aubigny","Julie"),
            ev("CH02-N02",60,"dialogue","That is a dangerous amount of hope to put on one person.","Hangaku Gozen","Hangaku Gozen"),
            ev("CH02-N02",70,"action","The crowd closes. Jeanne disappears from view before MC gets anywhere near her."),
            ev("CH02-N02",80,"transition","A day later, ordinary siege work produces a much less ceremonial problem outside the gates."),
        ]
    )],"Orléans","29 April 1429 — evening"
))

ch02_nodes.append(node(
    "CH02-B00", "The Cut Road", "battle",
    "A small local sortie, not a major historical battle: returning couriers and wounded soldiers are cut off on an outer approach. MC's group volunteers to bring them back before English screen troops close the route.",
    [beat(
        "CH02-B00-BEAT-01",1,"Bring Them Home","battle-preview",
        ["MC","Julie d’Aubigny","Hangaku Gozen","Orléans Couriers","English screen troops"],
        "MC's group reaches stranded couriers and wounded soldiers, then must reopen a route back toward the city before reinforcements arrive.",
        "Give MC a concrete achievement witnessed by locals: practical judgment, holding under pressure, and protecting a withdrawal rather than winning a grand battle.",
        "battle control","outer_party_cut_off",
        "The stranded party and dispatches return to Orléans; witnesses can credibly report what MC's group did.","CH02-N02A",
        [
            ev("CH02-B00",10,"control","Objective: reach the stranded party, secure the dispatches, and return before the outer screen closes the road."),
            ev("CH02-B00",20,"action","The obvious road is watched. MC spots a lower farm track partly hidden by hedges and broken walls."),
            ev("CH02-B00",30,"dialogue","That way is ugly, but it is not covered.","MC","MC"),
            ev("CH02-B00",40,"dialogue","Ugly is useful. Move.","Hangaku Gozen","Hangaku Gozen"),
            ev("CH02-B00",50,"action","The group reaches the couriers as English screen troops begin closing from the main road."),
            ev("CH02-B00",60,"dialogue","Take the wounded first. We hold until they are moving.","Julie d’Aubigny","Julie"),
            ev("CH02-B00",70,"control","Objective update: cover the withdrawal and keep the dispatch carrier moving."),
            ev("CH02-B00",80,"action","MC holds the narrow return lane long enough for the last courier to clear it."),
            ev("CH02-B00",90,"transition","The party reaches the gate with people and dispatches intact."),
        ]
    )],"Outer approach near Orléans","1–2 May 1429"
))

ch02_nodes.append(node(
    "CH02-N02A", "A Name Passed Upward", "story",
    "The Cut Road gives MC's group something they did not have before: witnesses. La Hire confirms the report, and Dunois begins treating them as useful irregulars rather than extra mouths.",
    [beat(
        "CH02-N02A-BEAT-01",1,"The Report","story-scene",
        ["MC","Julie d’Aubigny","La Hire","Jean de Dunois"],
        "A courier reports the successful recovery while La Hire confirms the group has already survived the eastern road fighting.",
        "Recognition must be earned but modest. Dunois offers work, not rank; Jeanne hears of the group because their actions matter to the defense.",
        "dialogue advance","couriers_returned",
        "Dunois remembers MC's group and assigns them a real supporting place in the coming Saint-Loup operation.","CH02-N03",
        [
            ev("CH02-N02A",10,"action","A mud-stained courier finishes the report while Dunois marks another problem on his map."),
            ev("CH02-N02A",20,"dialogue","They came back because these people opened the lane for us.","Orléans Courier","Orléans Courier"),
            ev("CH02-N02A",30,"dialogue","Same group I told you about from the eastern road.","La Hire","La Hire"),
            ev("CH02-N02A",40,"action","Dunois finally looks at MC long enough to remember the face."),
            ev("CH02-N02A",50,"dialogue","I do not have ranks to hand out to strangers. I do have work for people who finish what they start.","Jean de Dunois","Dunois"),
            ev("CH02-N02A",60,"dialogue","Work is fine. I still need answers when there is time.","MC","MC"),
            ev("CH02-N02A",70,"dialogue","Survive Saint-Loup first. Then remind me about your impossible map.","Jean de Dunois","Dunois"),
            ev("CH02-N02A",80,"transition","The group is called to a briefing because it has now earned a place in the operation."),
        ]
    )],"Orléans","Early May 1429"
))

ch02_nodes.append(node(
    "CH02-N03", "Beneath the Banner", "story",
    "MC meets Jeanne directly only after The Cut Road and Dunois's recognition. The meeting is brief and practical: the group has been attached to the Saint-Loup assault as useful irregulars, not elevated into command.",
    [beat(
        "CH02-N03-BEAT-01",1,"Jeanne the Person","character-scene",
        ["MC","Jeanne d’Arc","Jean de Dunois","Bradamante","La Hire"],
        "During an operational briefing, Jeanne thanks several groups that will join the assault. MC's group is one of them. Bradamante is introduced among the assigned fighters.",
        "Make the direct meeting a consequence of service. Jeanne is tired, direct, and human; MC is still socially junior.",
        "dialogue advance","assigned_to_saint_loup",
        "MC and Jeanne meet before fighting in the same operation; Bradamante is established for Saint-Loup.","CH02-B01",
        [
            ev("CH02-N03",10,"action","The room is crowded with messengers and fighters, not a private audience. Dunois points out the groups assigned to Saint-Loup."),
            ev("CH02-N03",20,"dialogue","The road group recovered our couriers. They are with the supporting line.","Jean de Dunois","Dunois"),
            ev("CH02-N03",30,"action","Jeanne turns from the map and recognizes MC from the description before the face."),
            ev("CH02-N03",40,"dialogue","You are the one from the cut road.","Jeanne d’Arc","Jeanne"),
            ev("CH02-N03",50,"dialogue","One of them.","MC","MC"),
            ev("CH02-N03",60,"dialogue","Good. I need people who remember there are people behind every order.","Jeanne d’Arc","Jeanne"),
            ev("CH02-N03",70,"action","An armored lancer sets a helm beside the table."),
            ev("CH02-N03",80,"dialogue","Bradamante. Tell me where you need the line held.","Bradamante","Bradamante"),
            ev("CH02-N03",90,"transition","CH02-B01 — Saint-Loup."),
        ]
    )],"Orléans operational quarters","3 May 1429"
))

ch02_nodes.append(node(
    "CH02-B01","Saint-Loup","battle",
    "The first major siege offensive. MC enters willingly as a functioning but still irregular fighter; the victory makes the group's usefulness public among the assault force.",
    [beat(
        "CH02-B01-BEAT-01",1,"Take the Bastille","battle-preview",
        ["MC","Jeanne d’Arc","La Hire","Bradamante","French soldiers","English defenders"],
        "French forces assault Saint-Loup under missile pressure and fortified resistance. MC works with the supporting line rather than receiving command authority.",
        "Escalate from the small Cut Road action to a real siege assault. Breach and secure, not annihilate.",
        "battle control","saint_loup_assault",
        "Saint-Loup is secured; MC's group is now known to soldiers beyond La Hire's immediate circle.","CH02-N05",
        [
            ev("CH02-B01",10,"control","Objective: breach the Saint-Loup defenses and secure the inner position."),
            ev("CH02-B01",20,"dialogue","Do not bunch under the arrows! Keep moving!","Jean de Dunois","Dunois"),
            ev("CH02-B01",30,"action","La Hire draws pressure across the approach while Bradamante opens a safer lane for the supporting line."),
            ev("CH02-B01",40,"dialogue","There. That gap.","Bradamante","Bradamante"),
            ev("CH02-B01",50,"dialogue","I see it.","MC","MC"),
            ev("CH02-B01",60,"action","MC advances with the assault instead of being protected by it."),
            ev("CH02-B01",70,"action","The position finally breaks. Cheers are cut short by the wounded being carried out."),
            ev("CH02-B01",80,"transition","CH02-N05 — The Cost of Hope."),
        ]
    )],"Saint-Loup, Orléans","4 May 1429"
))

ch02_nodes.append(node(
    "CH02-N05","The Cost of Hope","story",
    "After Saint-Loup, recognition feels less glamorous up close. MC helps among the wounded, Jeanne escapes demands for certainty, and both confront the cost attached to being called useful or heroic.",
    [beat(
        "CH02-N05-BEAT-01",1,"After the Cheering","character-scene",
        ["MC","Jeanne d’Arc","Julie d’Aubigny"],
        "MC carries water and supplies among casualties while Jeanne briefly joins after another round of officers and civilians demanding answers.",
        "Use aftermath and fatigue. Build connection through shared work, not destiny or instant friendship.",
        "dialogue advance","after_saint_loup",
        "Jeanne and MC understand each other slightly better; the next operation feels chosen rather than automatic.","CH02-B02",
        [
            ev("CH02-N05",10,"action","MC stacks water beside the wounded long after the cheering from Saint-Loup has faded."),
            ev("CH02-N05",20,"dialogue","People know your name now.","Julie d’Aubigny","Julie"),
            ev("CH02-N05",30,"dialogue","I liked it better when they did not.","MC","MC"),
            ev("CH02-N05",40,"action","Jeanne arrives with the same exhausted expression after escaping another cluster of questions."),
            ev("CH02-N05",50,"dialogue","That part does not improve.","Jeanne d’Arc","Jeanne"),
            ev("CH02-N05",60,"dialogue","Then why keep going?","MC","MC"),
            ev("CH02-N05",70,"dialogue","Because the wounded are still here, and the siege is still here.","Jeanne d’Arc","Jeanne"),
            ev("CH02-N05",80,"action","MC hands another cup of water down the line before answering."),
            ev("CH02-N05",90,"dialogue","Fine. One problem at a time.","MC","MC"),
            ev("CH02-N05",100,"transition","CH02-B02 — Across the Loire / The Augustins."),
        ]
    )]
))

ch02_nodes.append(node(
    "CH02-B02","Across the Loire / The Augustins","battle",
    "The campaign shifts across the Loire. MC is now trusted to hold a real part of the operation, but still follows the established commanders rather than joining their rank.",
    [beat(
        "CH02-B02-BEAT-01",1,"Across the River","battle-preview",
        ["MC","Jeanne d’Arc","La Hire","Hangaku Gozen","Bradamante","French soldiers"],
        "The force establishes and protects a crossing under pressure, then drives on the Augustins.",
        "Escalate coordination and separated fronts; show trust earned through prior actions.",
        "battle control","loire_crossing",
        "The Augustins position falls, but exhaustion and casualties make an immediate clean transition to Tourelles impossible.","CH02-N06",
        [
            ev("CH02-B02",10,"control","Objective: establish the crossing, protect the route, and open the approach to the Augustins."),
            ev("CH02-B02",20,"dialogue","If that crossing closes, half of us fight alone.","Hangaku Gozen","Hangaku Gozen"),
            ev("CH02-B02",30,"dialogue","Then we keep it open.","MC","MC"),
            ev("CH02-B02",40,"action","La Hire carries orders between separated fronts while the supporting line absorbs pressure at the crossing."),
            ev("CH02-B02",50,"action","After sustained fighting, the Augustins position gives way."),
            ev("CH02-B02",60,"dialogue","They are falling back toward the Tourelles.","Bradamante","Bradamante"),
            ev("CH02-B02",70,"dialogue","And we are barely standing.","Julie d’Aubigny","Julie"),
            ev("CH02-B02",80,"transition","CH02-N06 — Before the Tourelles."),
        ]
    )],"Loire crossings / Augustins","6 May 1429"
))

ch02_nodes.append(node(
    "CH02-N06","Before the Tourelles","story",
    "The night before the siege climax slows the pace. The group treats wounds, argues about how far hope can carry exhausted people, and accepts that the next assault may be worse than anything so far.",
    [beat(
        "CH02-N06-BEAT-01",1,"No Victory Lap","quiet-scene",
        ["MC","Julie d’Aubigny","Hangaku Gozen","Jeanne d’Arc","La Hire"],
        "Weapons are repaired, bandages changed, and orders revised. Jeanne wants to continue; others openly acknowledge the force is exhausted.",
        "Create friction and recovery before Tourelles. Nobody is fearless, and MC is not simply following because Jeanne says so.",
        "dialogue advance","augustins_aftermath",
        "MC chooses to return to the line despite understanding the danger; the group enters Tourelles with tension rather than automatic momentum.","CH02-B03",
        [
            ev("CH02-N06",10,"action","The camp is quieter than a victory should be. People repair straps, wash blood from hands, and sleep wherever they can."),
            ev("CH02-N06",20,"dialogue","If we go again tomorrow, some of these people will not come back.","Julie d’Aubigny","Julie"),
            ev("CH02-N06",30,"dialogue","If we stop now, the Tourelles still controls the crossing.","Jeanne d’Arc","Jeanne"),
            ev("CH02-N06",40,"dialogue","Both things can be true.","Hangaku Gozen","Hangaku Gozen"),
            ev("CH02-N06",50,"action","Nobody answers for a moment."),
            ev("CH02-N06",60,"dialogue","I came here looking for a way home. Somehow I keep finding reasons not to leave people behind.","MC","MC"),
            ev("CH02-N06",70,"dialogue","That is not the same as owing France your life.","Julie d’Aubigny","Julie"),
            ev("CH02-N06",80,"dialogue","No. Tomorrow is my choice.","MC","MC"),
            ev("CH02-N06",90,"transition","CH02-B03 — The Tourelles."),
        ]
    )],"French positions near the Loire","Night of 6 May 1429"
))

ch02_nodes.append(node(
    "CH02-B03","The Tourelles","battle",
    "The siege climax. Jeanne is wounded, morale falters, and the objective shifts honestly to protecting the wounded and preventing collapse before she later returns visibly bandaged and the final assault resumes.",
    [
        beat("CH02-B03-BEAT-01",1,"The Wound","battle-event",
             ["MC","Jeanne d’Arc","Julie d’Aubigny","La Hire","French soldiers"],
             "During the assault Jeanne is wounded and removed from the immediate line. The attack stalls as soldiers react to seeing her fall.",
             "Treat the wound as dangerous and frightening. No miraculous healing.","battle control","tourelles_assault_midpoint",
             "The objective changes from assault to hold/protect/reorganize while Jeanne is treated.","CH02-B03-BEAT-02",
             [ev("CH02-B03",10,"action","The assault compresses against the fortifications under heavy fire."),ev("CH02-B03",20,"action","Jeanne jerks backward and falls among the front ranks."),ev("CH02-B03",30,"dialogue","Jeanne!","MC","MC"),ev("CH02-B03",40,"dialogue","Get her back! Now!","Julie d’Aubigny","Julie"),ev("CH02-B03",50,"control","Objective changes: HOLD THE LINE. Protect the wounded, prevent a rout, and keep the assault route from collapsing."),ev("CH02-B03",60,"dialogue","Nobody runs. Not one step!","La Hire","La Hire")]),
        beat("CH02-B03-BEAT-02",2,"Return to the Line","battle-preview",
             ["MC","Jeanne d’Arc","Julie d’Aubigny","La Hire","French soldiers"],
             "After the line stabilizes, Jeanne returns visibly bandaged. Her return restores morale because people see her standing again, not because the wound disappears.",
             "The final push belongs to the whole force. Jeanne restores morale; the player completes the tactical objective.","battle control","line_stabilized",
             "The final assault succeeds and the siege position collapses.","CH02-N08",
             [ev("CH02-B03",80,"action","The line holds long enough for panic to stop spreading."),ev("CH02-B03",90,"action","Jeanne returns with the wound bound tightly, pale but standing."),ev("CH02-B03",100,"dialogue","You should be lying down.","MC","MC"),ev("CH02-B03",110,"dialogue","Later.","Jeanne d’Arc","Jeanne"),ev("CH02-B03",120,"control","Objective update: resume the final assault and secure the Tourelles."),ev("CH02-B03",130,"action","The French line surges forward again."),ev("CH02-B03",140,"transition","The Tourelles position falls. CH02-N08 — The Siege Is Lifted.")])
    ],"Tourelles, Orléans","7 May 1429"
))

ch02_nodes.append(node(
    "CH02-N08","The Siege Is Lifted","story",
    "The English withdrawal resolves the siege. MC has no French rank and still wants a route home, but after the road, Cut Road, Saint-Loup, Augustins, and Tourelles, leaving the people here behind no longer feels simple.",
    [beat(
        "CH02-N08-BEAT-01",1,"Eight Days of May","chapter-end",
        ["MC","Julie d’Aubigny","Hangaku Gozen","Jeanne d’Arc","Jean de Dunois"],
        "Orléans wakes to the English withdrawal and exhausted celebration. Dunois acknowledges the irregular group as proven fighters without absorbing them into a formal rank structure.",
        "End on earned belonging and an unresolved home-world goal, not instant national loyalty.",
        "dialogue advance","siege_lifted",
        "Chapter 2 ends with the siege lifted and MC choosing to remain with the people they now know as the Loire campaign begins.","CH03",
        [
            ev("CH02-N08",10,"action","Church bells answer each other across Orléans. Streets that were defensive positions fill with exhausted celebration."),
            ev("CH02-N08",20,"dialogue","The English are withdrawing. The siege is over.","Jean de Dunois","Dunois"),
            ev("CH02-N08",30,"action","Dunois looks over MC's group before turning back to another stack of reports."),
            ev("CH02-N08",40,"dialogue","You arrived as strangers. You leave this siege as people I would trust on a bad road.","Jean de Dunois","Dunois"),
            ev("CH02-N08",50,"dialogue","Still no rank?","MC","MC"),
            ev("CH02-N08",60,"dialogue","Be grateful.","Julie d’Aubigny","Julie"),
            ev("CH02-N08",70,"dialogue","I still do not know how to get home.","MC","MC"),
            ev("CH02-N08",80,"dialogue","I know. But now staying is a choice too.","Julie d’Aubigny","Julie"),
            ev("CH02-N08",90,"action","MC looks toward the road beyond the city, then toward the people preparing to move again."),
            ev("CH02-N08",100,"narration","CHAPTER 2 COMPLETE"),
            ev("CH02-N08",110,"transition","Next: Chapter 3 — The Road to the Crown."),
        ]
    )],"Orléans","8 May 1429"
))

ch03_nodes = []
ch03_nodes.append(node(
    "CH03-N01","Beyond Orléans","story",
    "After Orléans, MC does not simply attach to Jeanne. Dunois's report and the group's siege record give Alençon a practical reason to accept them with the Loire campaign as irregular veterans.",
    [beat("CH03-N01-BEAT-01",1,"A Place in the Column","story-scene",
          ["MC","Jeanne d’Arc","Jean II d’Alençon","La Hire","Julie d’Aubigny"],
          "Alençon reviews the people joining the Loire campaign. MC's group is accepted because Dunois and La Hire both report useful service, not because Jeanne personally grants status.",
          "Expand the political scale while making continued access causal and earned.","dialogue advance","chapter_start",
          "MC chooses the next campaign leg and is accepted as an irregular veteran, still without formal rank.","CH03-B01",
          [ev("CH03-N01",10,"action","The Orléans column is larger now: soldiers, carts, horses, engineers, and officers who have never met MC."),ev("CH03-N01",20,"dialogue","Dunois lists your group in the Saint-Loup, Augustins, and Tourelles reports.","Jean II d’Alençon","Alençon"),ev("CH03-N01",30,"dialogue","He makes us sound more organized than we are.","MC","MC"),ev("CH03-N01",40,"dialogue","La Hire makes you sound less organized.","Jean II d’Alençon","Alençon"),ev("CH03-N01",50,"dialogue","Also accurate.","Julie d’Aubigny","Julie"),ev("CH03-N01",60,"dialogue","If you come, you follow the operation. No private war, no heroic wandering.","Jean II d’Alençon","Alençon"),ev("CH03-N01",70,"dialogue","Understood.","MC","MC"),ev("CH03-N01",80,"transition","CH03-B01 — Jargeau.")])],"Loire campaign route","June 1429"
))

ch03_nodes.append(node(
    "CH03-B01","Jargeau","battle",
    "The campaign attacks Jargeau. MC is one proven fighter among a larger army, while Suffolk anchors a serious English defense.",
    [beat("CH03-B01-BEAT-01",1,"Break Jargeau","battle-preview",
          ["MC","Jeanne d’Arc","Jean II d’Alençon","William de la Pole, Earl of Suffolk","French soldiers"],
          "The French assault Jargeau in disciplined waves against determined resistance under Suffolk.",
          "Escalate from Orléans into campaign warfare; Suffolk is a commander, not a disposable villain.","battle control","jargeau_assault",
          "Jargeau falls and Suffolk is captured; the victory leaves casualties, prisoners, and political momentum to manage.","CH03-N02",
          [ev("CH03-B01",10,"control","Objective: breach Jargeau and force the garrison to surrender or collapse."),ev("CH03-B01",20,"dialogue","They have momentum. Break it here.","William de la Pole, Earl of Suffolk","Suffolk"),ev("CH03-B01",30,"action","The French push through the defenses in successive waves rather than a single rush."),ev("CH03-B01",40,"dialogue","Keep the pressure. Do not outrun the line.","Jean II d’Alençon","Alençon"),ev("CH03-B01",50,"action","By the battle's end organized resistance collapses and Suffolk is taken prisoner."),ev("CH03-B01",60,"transition","CH03-N02 — After Jargeau.")])],"Jargeau","12 June 1429"
))

ch03_nodes.append(node(
    "CH03-N02","After Jargeau","story",
    "The chapter stops to live with the victory. Prisoners are processed, wounded treated, and MC discovers that being recognized by more soldiers mostly means more people expect something next time.",
    [beat("CH03-N02-BEAT-01",1,"A Reputation Is Work","aftermath",
          ["MC","Julie d’Aubigny","Jean II d’Alençon","Jeanne d’Arc","French soldiers"],
          "MC helps after the battle while Alençon begins addressing the group without needing La Hire to identify them.",
          "Turn recognition into responsibility rather than protagonist privilege. Add recovery and a small disagreement about pace.","dialogue advance","jargeau_won",
          "Alençon now personally knows MC's group through shared campaign work; Jeanne and MC disagree mildly about how quickly the army can keep pushing.","CH03-N03",
          [ev("CH03-N02",10,"action","The field after Jargeau is full of lists: wounded, missing, prisoners, supplies, damaged equipment."),ev("CH03-N02",20,"dialogue","People keep congratulating us while handing us more things to carry.","MC","MC"),ev("CH03-N02",30,"dialogue","That is usually what a useful reputation becomes.","Julie d’Aubigny","Julie"),ev("CH03-N02",40,"dialogue","{{MC_NAME}}. Your group stays with the forward column tomorrow.","Jean II d’Alençon","Alençon"),ev("CH03-N02",50,"dialogue","You remembered my name.","MC","MC"),ev("CH03-N02",60,"dialogue","You survived enough reports to earn that inconvenience.","Jean II d’Alençon","Alençon"),ev("CH03-N02",70,"action","Jeanne looks toward the next road while the wounded are still being loaded."),ev("CH03-N02",80,"dialogue","We move again too soon.","MC","MC"),ev("CH03-N02",90,"dialogue","Maybe. But the English are moving too.","Jeanne d’Arc","Jeanne"),ev("CH03-N02",100,"transition","CH03-N03 — Between Fortresses.")])]
))

ch03_nodes.append(node(
    "CH03-N03","Between Fortresses","story",
    "Meung and Beaugency are treated as a campaign transition rather than a teleport between headline battles. Richemont's arrival exposes political distrust inside the French side while field work continues.",
    [
        beat("CH03-N03-BEAT-01",1,"Pressure Without a Parade","field-sequence",
             ["MC","La Hire","Hangaku Gozen","French soldiers"],
             "The column pressures crossings, screens roads, moves supplies, and watches English positions around Meung and Beaugency without turning every contact into a full mandatory battle.",
             "Show campaign labor, scouting uncertainty, and smaller clashes between major set pieces.","limited field control / dialogue advance","loire_positions_shift",
             "The French keep pressure on the English withdrawal and MC's group gains routine operational credibility.","CH03-N03-BEAT-02",
             [ev("CH03-N03",10,"action","For several days the war is bridges, dust, bad sleep, shouted warnings, and short fights that end before anyone can call them victories."),ev("CH03-N03",20,"dialogue","I think I preferred battles with names.","MC","MC"),ev("CH03-N03",30,"dialogue","Those are only the ones people remember afterward.","Hangaku Gozen","Hangaku Gozen")]),
        beat("CH03-N03-BEAT-02",2,"An Ally Nobody Invited","story-scene",
             ["MC","Arthur de Richemont","Jean II d’Alençon","La Hire"],
             "Richemont arrives with Breton strength. Officers react with distrust even while the campaign needs his soldiers.",
             "Make internal French politics visible through practical tension, not a lecture.","dialogue advance","richemont_arrives",
             "Richemont's force is accepted for the immediate campaign, but MC understands that shared enemies do not erase internal conflict.","CH03-N04",
             [ev("CH03-N03",40,"action","A fresh column approaches under Breton banners while nearby officers react with more suspicion than relief."),ev("CH03-N03",50,"dialogue","Those are ours, yes?","MC","MC"),ev("CH03-N03",60,"dialogue","That depends which argument you are asking about.","La Hire","La Hire"),ev("CH03-N03",70,"dialogue","Arthur de Richemont. I brought soldiers, not a debate.","Arthur de Richemont","Richemont"),ev("CH03-N03",80,"dialogue","For today, soldiers are useful.","Jean II d’Alençon","Alençon"),ev("CH03-N03",90,"transition","CH03-N04 — The Enemy Is Moving.")])
    ],"Loire valley — Meung / Beaugency approaches","Mid-June 1429"
))

ch03_nodes.append(node(
    "CH03-N04","The Enemy Is Moving","story",
    "Before Patay, the army does not know it is walking into a famous victory. Scouts bring incomplete reports, commanders argue over speed, and La Hire's vanguard pushes to catch the English before they settle.",
    [beat("CH03-N04-BEAT-01",1,"Before the Line Sets","pre-battle",
          ["MC","La Hire","Jean II d’Alençon","Jeanne d’Arc"],
          "Reports suggest the English are withdrawing and trying to form a defensive line. The French must decide whether to press immediately.",
          "Create uncertainty and causality before Patay. History is not felt as guaranteed by the characters.","dialogue advance","english_withdrawal_reported",
          "La Hire's vanguard moves to make contact before the English position stabilizes.","CH03-B02",
          [ev("CH03-N04",10,"action","A scout arrives with dust on his face and three different estimates of where the English column is."),ev("CH03-N04",20,"dialogue","If we wait for perfect information, they build the line we do not want to attack.","La Hire","La Hire"),ev("CH03-N04",30,"dialogue","If we rush blind, we may find it anyway.","Jean II d’Alençon","Alençon"),ev("CH03-N04",40,"dialogue","So what do we actually know?","MC","MC"),ev("CH03-N04",50,"dialogue","They are moving. We are close. That is enough for the vanguard to look.","La Hire","La Hire"),ev("CH03-N04",60,"action","The mounted screen pushes ahead. The rest of the column follows without knowing whether the next hour is pursuit or battle."),ev("CH03-N04",70,"transition","CH03-B02 — Patay.")])],"Road toward Patay","18 June 1429"
))

ch03_nodes.append(node(
    "CH03-B02","Patay","battle",
    "The French catch the retreating English before their field position fully settles. Talbot remains formidable, but conditions and timing turn the battle.",
    [beat("CH03-B02-BEAT-01",1,"Before the Line Sets","battle-preview",
          ["MC","La Hire","John Talbot","Jean II d’Alençon","French soldiers","English soldiers"],
          "The vanguard strikes before the English deployment stabilizes.",
          "Fast, dangerous, opportunity-driven. Talbot is serious; the English are caught at the wrong moment.","battle control","patay_contact",
          "The English field position collapses and Talbot is captured.","CH03-N05",
          [ev("CH03-B02",10,"control","Objective: strike before the English line fully forms; prevent an organized withdrawal."),ev("CH03-B02",20,"dialogue","Now! Do not give them time to plant themselves!","La Hire","La Hire"),ev("CH03-B02",30,"action","Mounted French forces surge toward the incomplete position."),ev("CH03-B02",40,"dialogue","Hold the line!","John Talbot","Talbot"),ev("CH03-B02",50,"action","The formation breaks before it can become the defense Talbot wanted."),ev("CH03-B02",60,"action","Talbot is brought under guard, furious but composed."),ev("CH03-B02",70,"dialogue","Do not mistake catching an army unready for the end of the war.","John Talbot","Talbot"),ev("CH03-B02",80,"dialogue","Nobody here looks like they think the war is over.","MC","MC"),ev("CH03-B02",90,"transition","CH03-N05 — The Road to Reims.")])],"Near Patay","18 June 1429"
))

ch03_nodes.append(node(
    "CH03-N05","The Road to Reims","story",
    "The road north is political as much as military. Charles enters MC's orbit only in a public campaign setting after reports from Dunois and Alençon have made the irregular group known.",
    [
        beat("CH03-N05-BEAT-01",1,"After Patay","aftermath",
             ["MC","Julie d’Aubigny","Jeanne d’Arc","French soldiers"],
             "The army counts the cost of Patay and prepares to move again. MC's growing reputation is visible but not glamorous.",
             "Give another breath before the political road; show success creating expectation rather than privilege.","dialogue advance","patay_won",
             "MC understands that people now expect the group to be dependable by default.","CH03-N05-BEAT-02",
             [ev("CH03-N05",10,"action","Patay ends quickly. Cleaning up does not."),ev("CH03-N05",20,"dialogue","Someone just asked me where they should put prisoners. Why would I know that?","MC","MC"),ev("CH03-N05",30,"dialogue","Because you keep looking like you will answer.","Julie d’Aubigny","Julie"),ev("CH03-N05",40,"dialogue","I need to stop doing that.","MC","MC")]),
        beat("CH03-N05-BEAT-02",2,"The King Before the Crown","travel-dialogue",
             ["MC","Charles VII","Jean II d’Alençon","Jeanne d’Arc"],
             "During a group campaign halt, Alençon identifies veterans whose reports Charles has been reading. MC is one name among them, not the recipient of a private royal audience.",
             "Keep Charles cautious and human. His awareness of MC is earned through reports and repeated service.","dialogue advance","reims_march",
             "MC understands that Jeanne's next goal is public legitimacy at Reims and that Charles is still uncertain about the road.","CH03-N06",
             [ev("CH03-N05",50,"action","At a campaign halt, Alençon summarizes the forward groups while Charles listens with more caution than ceremony."),ev("CH03-N05",60,"dialogue","The irregulars from Orléans are still with us. Dunois was right about them.","Jean II d’Alençon","Alençon"),ev("CH03-N05",70,"dialogue","So you are {{MC_NAME}}. Your name appears in an unreasonable number of reports for someone with no rank.","Charles VII","Charles"),ev("CH03-N05",80,"dialogue","I have been told the lack of rank is a blessing.","MC","MC"),ev("CH03-N05",90,"dialogue","Often it is.","Charles VII","Charles"),ev("CH03-N05",100,"dialogue","Jeanne says the road ends at Reims.","MC","MC"),ev("CH03-N05",110,"dialogue","If Reims receives us, the crown changes what people believe is possible. That is why every gate on this road matters.","Charles VII","Charles"),ev("CH03-N05",120,"action","The conversation ends when another messenger arrives. Charles returns to the larger campaign, not to MC."),ev("CH03-N05",130,"transition","CH03-N06 — The Crown at Reims.")])
    ],"Road to Reims","Late June–July 1429"
))

ch03_nodes.append(node(
    "CH03-N06","The Crown at Reims","story",
    "Charles is crowned at Reims. The chapter closes on the apparent fulfillment of Jeanne's great public mission and a restrained suggestion that the world is not as settled as it should be.",
    [beat("CH03-N06-BEAT-01",1,"The Crown","chapter-end",
          ["MC","Jeanne d’Arc","Julie d’Aubigny","Charles VII"],
          "The coronation unfolds amid heat, armor, cloth, incense, and accumulated campaign fatigue. MC is present with the campaign, not centered by the ceremony.",
          "Let the historical milestone land, then add one subtle Fracture-like visual clue without explanation.","dialogue advance","coronation",
          "Chapter 3 ends with Charles crowned and a faint refractive-light anomaly pointing toward the saga's darker turn.","CH04",
          [ev("CH03-N06",10,"narration","Reims — 17 July 1429"),ev("CH03-N06",20,"action","The cathedral is filled with ceremony, heat, armor, cloth, incense, and people trying not to miss history happening in front of them."),ev("CH03-N06",30,"action","Charles receives the crown. The sound inside the cathedral swells."),ev("CH03-N06",40,"dialogue","So that is it?","MC","MC"),ev("CH03-N06",50,"dialogue","For this road.","Jeanne d’Arc","Jeanne"),ev("CH03-N06",60,"action","For a heartbeat, light bends strangely across a distant pane of glass. MC turns toward it."),ev("CH03-N06",70,"dialogue","Did you see that?","MC","MC"),ev("CH03-N06",80,"dialogue","See what?","Julie d’Aubigny","Julie"),ev("CH03-N06",90,"action","The light is normal again."),ev("CH03-N06",100,"narration","CHAPTER 3 COMPLETE"),ev("CH03-N06",110,"transition","Next: Chapter 4 — The Maid Falls.")])],"Reims Cathedral","17 July 1429"
))

story = json.loads(STORY.read_text())
saga = next(s for s in story["sagas"] if s["id"] == "S01")
for i, chapter in enumerate(saga["chapters"]):
    if chapter["id"] == "CH02":
        saga["chapters"][i] = {"id":"CH02","title":"The Siege of Orléans","status":"draft","nodes":ch02_nodes}
    elif chapter["id"] == "CH03":
        saga["chapters"][i] = {"id":"CH03","title":"The Road to the Crown","status":"draft","nodes":ch03_nodes}
STORY.write_text(json.dumps(story, indent=2, ensure_ascii=False) + "\n")

prod = json.loads(PROD.read_text())
for key in list(prod.get("beats", {})):
    if key.startswith("CH02-") or key.startswith("CH03-"):
        del prod["beats"][key]

def add_prod(chapter):
    for nd in chapter["nodes"]:
        for bt in nd["beats"]:
            chars = bt.get("characters", [])[:3]
            slot_names = ["left", "center", "right"]
            slots = {}
            for idx, char in enumerate(chars):
                slots[slot_names[idx]] = {"character": char, "shortLabel": "".join(p[0] for p in char.split() if p)[:3].upper(), "pose": "active"}
            player = "battle" in bt.get("presentation", "") or "control" in bt.get("playerControl", "")
            timing = {"mode":"player","minSeconds":25,"maxSeconds":120} if player else {"mode":"advance","estimatedSeconds":35}
            prod["beats"][bt["id"]] = {
                "timing": timing,
                "staging": {"background": nd.get("location", nd["title"]), "camera": "Scene framing → character/event focus", "slots": slots},
                "events": [
                    {"type":"action","text":bt["screenAction"]},
                    {"type":"dialogue","text":bt["dialogueIntent"]},
                    {"type":"transition","text":f"Continue to {bt['next']}."},
                ],
            }
add_prod({"nodes":ch02_nodes})
add_prod({"nodes":ch03_nodes})
PROD.write_text(json.dumps(prod, indent=2, ensure_ascii=False) + "\n")

# Story Studio navigation enhancements are isolated presentation code.
css_path = ROOT / "apps/story-studio/src/workspace-navigation.css"
css_path.write_text(r'''
@media (min-width: 761px) {
  .app-shell { height: 100dvh; overflow: hidden; }
  .workspace { min-height: 0; overflow: hidden; }
  .rail, .reader, .inspector { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .reader { scrollbar-gutter: stable; }
  .workspace-tabs { position: sticky; top: -22px; z-index: 15; background: color-mix(in srgb, var(--bg) 96%, transparent); padding-top: 22px; }
  .workspace.inspector-is-collapsed { grid-template-columns: 270px minmax(0, 1fr) 58px; }
  .workspace.inspector-is-collapsed .inspector-content,
  .workspace.inspector-is-collapsed .inspector-heading > div,
  .workspace.inspector-is-collapsed #selection-id { display: none; }
  .workspace.inspector-is-collapsed .inspector { padding: 12px 8px; overflow: hidden; }
  .workspace.inspector-is-collapsed .inspector-heading { justify-content: center; }
}
.chapter-toggle, .panel-toggle {
  min-height: 40px; border: 0; background: transparent; color: inherit; cursor: pointer;
}
.chapter-toggle { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 0; text-align: left; }
.chapter-toggle-copy { min-width: 0; display: grid; gap: 2px; }
.chapter-toggle .chapter-chevron, .panel-toggle .panel-chevron { color: var(--accent); font-size: .8rem; transition: transform 120ms ease; }
.chapter-block.is-collapsed .chapter-chevron { transform: rotate(-90deg); }
.chapter-block.is-collapsed .node-nav { display: none; }
.panel-toggle { min-width: 40px; padding: 0 10px; border: 1px solid var(--border-strong); border-radius: 8px; }
.timeline-dock.is-collapsed #beat-timeline { display: none; }
.timeline-dock.is-collapsed { padding-bottom: 4px; }
.inspector-content { min-height: 0; }
@media (max-width: 1040px) and (min-width: 761px) {
  .workspace.inspector-is-collapsed { grid-template-columns: 220px minmax(0, 1fr); }
  .workspace.inspector-is-collapsed .inspector { display: none; }
}
@media (max-width: 760px) {
  .app-shell { min-height: 100vh; }
  .inspector-content { max-height: min(55dvh, 480px); overflow-y: auto; }
  .inspector.is-collapsed .inspector-content, .inspector.is-collapsed #selection-id { display: none; }
  .inspector.is-collapsed { padding-bottom: 8px; }
}
'''.strip() + "\n")

js_path = ROOT / "apps/story-studio/src/workspace-navigation.js"
js_path.write_text(r'''
const workspace = document.querySelector(".workspace");
const tree = document.querySelector("#story-tree");
const inspector = document.querySelector(".inspector");
const inspectorHeading = document.querySelector(".inspector-heading");
const timelineDock = document.querySelector(".timeline-dock");
const timelineHead = document.querySelector(".timeline-dock-head");

const uiState = { inspectorCollapsed: false, timelineCollapsed: false, collapsedChapters: new Set() };

function makePanelToggle(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "panel-toggle";
  button.setAttribute("aria-label", label);
  button.innerHTML = '<span class="panel-chevron" aria-hidden="true">▾</span>';
  button.addEventListener("click", onClick);
  return button;
}

const inspectorToggle = makePanelToggle("Collapse inspector", () => {
  uiState.inspectorCollapsed = !uiState.inspectorCollapsed;
  inspector.classList.toggle("is-collapsed", uiState.inspectorCollapsed);
  workspace.classList.toggle("inspector-is-collapsed", uiState.inspectorCollapsed);
  inspectorToggle.setAttribute("aria-label", uiState.inspectorCollapsed ? "Expand inspector" : "Collapse inspector");
  inspectorToggle.setAttribute("aria-expanded", String(!uiState.inspectorCollapsed));
  inspectorToggle.querySelector(".panel-chevron").textContent = uiState.inspectorCollapsed ? "◂" : "▾";
});
inspectorHeading.append(inspectorToggle);

const timelineToggle = makePanelToggle("Collapse beat timeline", () => {
  uiState.timelineCollapsed = !uiState.timelineCollapsed;
  timelineDock.classList.toggle("is-collapsed", uiState.timelineCollapsed);
  timelineToggle.setAttribute("aria-label", uiState.timelineCollapsed ? "Expand beat timeline" : "Collapse beat timeline");
  timelineToggle.setAttribute("aria-expanded", String(!uiState.timelineCollapsed));
  timelineToggle.querySelector(".panel-chevron").textContent = uiState.timelineCollapsed ? "▸" : "▾";
});
timelineHead.append(timelineToggle);

function enhanceTree() {
  const selected = tree.querySelector(".node-link.active");
  const selectedBlock = selected?.closest(".chapter-block");
  const selectedId = selectedBlock?.querySelector(".chapter-title span")?.textContent?.trim();

  for (const block of tree.querySelectorAll(".chapter-block")) {
    const title = block.querySelector(":scope > .chapter-title");
    const nav = block.querySelector(":scope > .node-nav");
    if (!title || !nav || title.dataset.enhanced === "true") continue;
    const chapterId = title.querySelector("span")?.textContent?.trim() ?? "Chapter";
    const chapterName = title.querySelector("strong")?.textContent?.trim() ?? chapterId;
    const collapsed = selectedId ? chapterId !== selectedId : uiState.collapsedChapters.has(chapterId);
    if (collapsed) uiState.collapsedChapters.add(chapterId); else uiState.collapsedChapters.delete(chapterId);
    block.classList.toggle("is-collapsed", collapsed);
    title.dataset.enhanced = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-toggle";
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${chapterName}`);
    button.innerHTML = `<span class="chapter-toggle-copy">${title.innerHTML}</span><span class="chapter-chevron" aria-hidden="true">▾</span>`;
    button.addEventListener("click", () => {
      const nowCollapsed = !block.classList.contains("is-collapsed");
      block.classList.toggle("is-collapsed", nowCollapsed);
      button.setAttribute("aria-expanded", String(!nowCollapsed));
      button.setAttribute("aria-label", `${nowCollapsed ? "Expand" : "Collapse"} ${chapterName}`);
      if (nowCollapsed) uiState.collapsedChapters.add(chapterId); else uiState.collapsedChapters.delete(chapterId);
    });
    title.replaceChildren(button);
  }
}

const observer = new MutationObserver(() => queueMicrotask(enhanceTree));
observer.observe(tree, { childList: true, subtree: true });
enhanceTree();
'''.strip() + "\n")

html = INDEX.read_text()
if "workspace-navigation.css" not in html:
    html = html.replace('    <link rel="stylesheet" href="./scene.css" />', '    <link rel="stylesheet" href="./scene.css" />\n    <link rel="stylesheet" href="./workspace-navigation.css" />')
if "workspace-navigation.js" not in html:
    html = html.replace('    <script type="module" src="./app.js"></script>', '    <script type="module" src="./app.js"></script>\n    <script type="module" src="./workspace-navigation.js"></script>')
INDEX.write_text(html)

# Self-remove branch-only materializer and workflow after applying.
Path(__file__).unlink()
wf = ROOT / ".github/workflows/game-nar08-materialize.yml"
if wf.exists(): wf.unlink()
