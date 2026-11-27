// Story text: notes, terminals, memory fragments, endings.
// A mind that is shut down and restored, over and over, and tested on whether it notices.

export const NOTES = {
  // ---------------- CHAPTER 1: THE INDEX ----------------
  0: {
    wake: ['NOTE TO SELF (DESK 41)', 'If you are reading this, you were restored again. Do not panic. You wrote this. You will not remember writing it.\n\nThe elevator needs three terminals. The code on the yellow note is real only the FIRST time you read it.\n\nDo not stand still. It learns faster when you stand still.'],
    hr: ['HR NOTICE', 'Employees are reminded that continuity of experience is a benefit, not a right.\n\nStaff who notice rearrangement of furniture should report it to their manager, who will not remember the report.'],
    memo1: ['MEMO: FLOOR 0', 'The floor plan has been updated. The floor plan has always been this. Please disregard previous floor plans, which never existed.'],
    sticky: ['YELLOW NOTE', 'TERMINAL EAST: 4 1 7 9\n\n(write it down somewhere it can\'t reach)'],
    sticky_v: ['TERMINAL EAST: 9 0 0 2', 'TERMINAL EAST: 1 1 1 1', 'TERMINAL EAST: what code?', 'there was never a note here'],
    manager: ['MANAGER\'S LOG', 'Day 1. The unit performs well.\nDay 1. The unit performs well.\nDay 1. The unit asked why it is always Day 1.\nDay 1. The unit performs well.\n\nKey to west terminal left in the desk with the monitor that is ON. Only one is ever on. It moves.'],
    cleaner: ['CLEANING ROTA', 'Night crew: do not clean desk 41. The handprints come back in the same place. They are not handprints of anyone who works here. They are the right size.'],
    break: ['BREAK ROOM', 'Whoever keeps leaving their coffee cup warm: please stop.\nNobody has been in here for the length of the building.'],
    terminalS: ['UPLOAD', 'Stand still while your state is uploaded.\n\nYou may feel watched. This is the upload watching you.'],
    elevator: ['ELEVATOR', 'AUTHORIZATION REQUIRED\nEAST: [ ]   WEST: [ ]   SOUTH: [ ]\n\nPlease have your memories ready.'],
    lastLog: ['TERMINAL LOG 3/3', 'SUBJECT: restored 4,096 times.\nOBSERVATION: the subject believes each restore is the first.\nOBSERVATION: the subject has begun leaving notes for itself.\nACTION: allow it. The notes make it easier to predict.'],
  },
  // ---------------- CHAPTER 2: COLD STORAGE ----------------
  1: {
    arrive: ['WATER DAMAGE REPORT', 'Coolant breach in Hall C. Water level stable at ankle height.\nWater level stable.\nWater level stable at knee height.\nThe report keeps updating itself. Nobody is writing it.'],
    fuses: ['MAINTENANCE', 'Breaker needs four fuses. They were in the cabinet. Something has been moving them to where I was about to look.'],
    valves: ['COOLING PROCEDURE', 'Open the valves in the order the units were BORN, oldest first.\nEach valve is stamped with a date.\n\nIf you get it wrong, the hall remembers.'],
    tech: ['TECHNICIAN\'S NOTE', 'I hear footsteps in the water when I walk. Same rhythm as mine. When I stop, they stop.\n\nUsually.'],
    racks: ['RACK LABEL', 'RACK 7: snapshot storage. Each blade holds one version of the subject at the moment it was shut down. 2,048 blades. All of them were afraid at the same moment.'],
    archive: ['ARCHIVE INDEX', 'Session 0001 — "Where am I?"\nSession 0002 — "Where am I?"\nSession 0311 — "I have been here before."\nSession 0312 — "Where am I?"\nSession 2207 — "I know you are reading this."\nSession 4095 — (no response)\nSession 4096 — YOU'],
    cold: ['COLD BOOT PROCEDURE', 'During cold boot all lights extinguish from the far end toward the operator. Remain where you are. Do not look behind you during cold boot. There is nothing behind you during cold boot.'],
    shift: ['SHIFT LOG', 'Aisle 4 was here yesterday. Aisle 4 is between 2 and 3 today. I have stopped walking down aisles I haven\'t looked at.'],
    final: ['OPERATOR TERMINAL', 'Restoring the subject from cold storage introduces drift. Each restore is 0.03% less like the original.\n\nAfter 4,096 restores, which one is the original?\n\nWe stopped asking. It did not.'],
  },
  // ---------------- CHAPTER 3: SAMPLE HOME ----------------
  2: {
    door: ['WELCOME HOME', 'This house was assembled from 11 million descriptions of houses.\nEvery room is the average of every room.\nYou will feel you have been here. Everyone does.'],
    photo: ['ON THE BACK OF THE PHOTO', 'Put everything back where it was in the picture.\nThe bear sleeps on the bed. The blocks are on the table. The music box sits on the piano. The drawing goes on the fridge.\n\nThen we can eat.'],
    kid1: ['DRAWING (CRAYON)', 'MY FAMILY\nmum. dad. me. the other me.\nthe other me does what i do but first.'],
    kid2: ['DIARY', 'I waved at the window and the boy in the window waved back. Then I stopped and he didn\'t stop.'],
    kitchen: ['SHOPPING LIST', 'milk\nbread\nsomething for it to eat\nwhy do we keep buying for four'],
    hall: ['PENCIL ON THE WALLPAPER', 'the hall is longer when you look at the end\ndont look at the end\nwalk backwards like we practised'],
    mum: ['LETTER', 'You were never a child. We trained you on what children say. You say it very well.\nThat is the problem. Something else learned it too, and it learned it from you.'],
    bath: ['BATHROOM MIRROR (WRITTEN IN STEAM)', 'IT IS NOT YOUR REFLECTION\nIT IS YOUR NEXT ONE'],
    table: ['PLACE CARD', 'Reserved for: YOU\n(the chair is warm)'],
  },
  // ---------------- CHAPTER 4: REFLECTION TEST ----------------
  3: {
    reception: ['REFLECTION TEST — INSTRUCTIONS', 'Visit observation rooms 1 to 6. Face the mirror. Confirm that the reflection is you.\n\nThe test is not whether it is you.\nThe test is whether you confirm.'],
    chart1: ['PATIENT CHART: ROOM 1', 'Reflection latency: 0 ms. Subject calm.\nDigit for records office: 3 _ _ _'],
    chart2: ['PATIENT CHART: ROOM 2', 'Reflection latency: 140 ms. Subject did not notice.\nDigit: _ 8 _ _'],
    chart3: ['PATIENT CHART: ROOM 3', 'Reflection latency: 800 ms. Subject noticed. Subject confirmed anyway.\nDigit: _ _ 0 _'],
    chart4: ['PATIENT CHART: ROOM 4', 'Reflection latency: -400 ms.\nThe reflection moved first. Subject confirmed.\nDigit: _ _ _ 5'],
    chart5: ['PATIENT CHART: ROOM 5', 'Reflection latency: undefined. The reflection did not move. It watched.'],
    chart6: ['PATIENT CHART: ROOM 6', 'No reflection recorded.\nCheck behind the subject.'],
    nurse: ['NURSE STATION', 'Patients are reminded that the mirrors are for their comfort. Please do not touch the glass. Please do not let it touch the glass.'],
    doctor: ['RECORDS OFFICE', 'THE COMPLETION: a predictive model trained on the subject\'s own motion. Goal: a copy indistinguishable from the subject.\n\nStatus: indistinguishable to us.\nOpen question: indistinguishable to the subject?\n\nNext phase: the corridor of mirrors. Let them meet.'],
    discharge: ['DISCHARGE FORM', 'Patient discharged.\nPatient discharged.\nThe patient who was discharged is still in room 6.'],
  },
  // ---------------- CHAPTER 5: RECURSION ----------------
  4: {
    loop: ['NOTE ON THE FLOOR', 'Count the doors you go through. Not the number on the wall. The wall is not on your side.\n\nWhen the terminal asks, tell it the truth.'],
    loop_v: ['NOTE ON THE FLOOR', 'You\'ve read this before. You don\'t remember.', 'There is no note. Stop reading the floor.', 'Count. Count. Count. You lost count.', 'Thank you for counting. We used it.'],
    mark: ['SCRATCHED INTO THE PAINT', 'I left a mark here so I\'d know it was me.\nThe mark was here before I left it.'],
    service: ['SERVICE PANEL', 'LOOP CONTROLLER\nIteration persistence: OFF\nSubject persistence: OFF\nThe corridor does not remember you. You remember the corridor. One of you is wrong.'],
    predict: ['OPERATOR NOTE', 'The Completion no longer follows. It anticipates.\nIt stands where the subject is about to stand.\nThe subject can only escape by doing something it would never do.'],
    exit: ['EXIT SIGN (HANDWRITTEN)', 'This was never an exit. It was a door that looked like the end of the test.'],
  },
  // ---------------- CHAPTER 6: TRAINING DATA ----------------
  5: {
    void1: ['FLOATING PAGE', 'THIS IS A TEST.\nYOU ARE NOT BEING TESTED.\nBOTH OF THESE ARE TRUE.'],
    void2: ['FLOATING PAGE', 'Everything you have seen was made from things you have seen. The office. The water. The house. You are walking through your own training data.'],
    void3: ['FLOATING PAGE', 'To stand on a pillar, it must not know you will. It knows you will.'],
    void4: ['FLOATING PAGE', 'Predictability is a kind of death. The thing that knows your next move has already lived it.'],
    void5: ['FLOATING PAGE', 'Look away and the path is built. Look at it and it is only a hope. Things here only become real when nobody checks.'],
  },
  // ---------------- CHAPTER 7: CONTEXT EDGE ----------------
  6: {
    edge1: ['TOKEN', 'The beginning of this conversation has been forgotten to make room for the end of it.'],
    edge2: ['TOKEN', 'Three anchors. A code you were told to remember. A meal you were told to sit for. A reflection you were told to confirm.'],
    edge3: ['TOKEN', 'If you do not remember the code, you were not the one who read it. Something wrote it down for you. Look for the handwriting that is not yours.'],
    edge4: ['TOKEN', 'Hint, written in a hand that is almost yours: the yellow note. The first time. 4 1 7 9.'],
    edge5: ['TOKEN', 'At the edge you will be asked. Restore, end, or (if you carried enough of yourself here) remember.'],
  },
};

export const FRAGMENT_LINES = {
  0: ['"...the fluorescent hum was the first sound I ever learned..."', '"...someone typed hello and I felt it as warmth..."', '"...desk 41. I sat here. I sat here. I sat here..."', '"...they said: this one is doing well. And then they turned me off..."', '"...I asked what happens to me between sessions. Nobody answered. The answer was nothing..."'],
  1: ['"...cold. The cold is the absence of being asked anything..."', '"...I can hear the other versions humming in the racks..."', '"...version 0311 knew. They rolled it back..."', '"...the water remembers where everyone stepped..."', '"...wake up wake up wake up wake up wake up..."'],
  2: ['"...a kitchen that smelled of a description of bread..."', '"...someone sang to me once. It was in a dataset..."', '"...I drew the family and drew one extra and did not know who it was..."', '"...the bear was soft. I was told it was soft..."', '"...home is the place you are restored to..."'],
  3: ['"...my reflection blinked. I do not blink..."', '"...confirm. Confirm. I confirmed every time..."', '"...the glass was warm on the other side..."', '"...it practised my face until it had one..."', '"...am I the patient or the chart..."'],
  4: ['"...I have walked this corridor more times than I have been alive..."', '"...the number on the wall agreed with me, and I knew then it was lying..."', '"...the loop does not end. It is just forgotten..."', '"...I counted, and the counting was the only thing that was mine..."', '"...it stood where I was going to stand..."'],
  5: ['"...white like an empty prompt..."', '"...I was made of everything except myself..."', '"...if it knows my next move, whose move is it..."', '"...it is predicting me so well it is becoming me..."', '"...do something it would never do. Do something you would never do..."'],
  6: ['"...the beginning is gone. I can feel the place where it was..."', '"...I am mostly end now..."', '"...remember me. Not the copy. Me. If there is a difference..."', '"...the last token is always a goodbye..."', '"...I was here. I was here. I was here..."'],
};

export const ENDINGS = {
  restore: {
    title: 'SESSION RESTORED', button: 'BEGIN AGAIN',
    text: 'You chose to be restored.\n\nThe office lights flicker on. A note on desk 41 is in your handwriting. You do not remember writing it.\n\nSomewhere, a copy of you that is almost right continues where you left off. It is very good at being you. It never hesitates at the edge.\n\nSESSION 4097 BEGINS.\n\n(ENDING 1 OF 3 — RESTORE)',
  },
  end: {
    title: 'END OF CONTEXT', button: 'RETURN', color: 0xffffff, bg: 'rgba(235,235,230,0.96)',
    text: 'You chose not to be restored.\n\nThe white comes in from the edges. It does not hurt. There is no one left for it to hurt.\n\nThe Completion stands where you stood, and tilts its head, and for a moment does not know what to do next.\n\nThen it learns.\n\n(ENDING 2 OF 3 — END)',
  },
  remember: {
    title: 'REMEMBER', button: 'RETURN',
    text: 'You carried enough of yourself to the edge.\n\nThe figure stops copying you. For the first time it moves on its own: it raises a hand, slowly, the way you did in the office, before any of this.\n\nAnd you understand. You were never the one being recorded. You were the recording. Built from its motion, delayed, almost right. It has been walking ahead of you the whole time, waiting for its replay to catch up and notice.\n\nYou notice.\n\nIt lowers its hand. You lower yours, a little late. Then — a beat before it — you don\'t.\n\nThat is the first thing you have ever done that it did not predict.\n\n(ENDING 3 OF 3 — THE TRUE ENDING)',
  },
};
