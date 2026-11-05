
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn
} from 'react-native-reanimated';


type ReviewItem = {
  id: string;
  category: string;
  phrase: string;
  question: string;
  options: string[];
  correct: string;
  example: string;
  attempts: number;
  addedAt: number;
};

const REVIEW_STORAGE_KEY = 'mexicanSlangReviewItems';

const conversationSteps = [
  {
    scene: 'At a taco stand',
    location: '🌮 Taquería',
    dialogue: [
      {
        speaker: 'Taquero',
        line: '¿Qué te damos?',
        translation: 'What can I get you?',
        prompt: 'You want to order three tacos. What do you say?',
        options: ['Me da tres tacos, por favor.', 'Estoy tres tacos.', 'Tengo hambre tres tacos.'],
        correct: 'Me da tres tacos, por favor.',
        explanation: '“¿Me da…?” is a natural, polite way to order something from a vendor.',
        tip: 'In Mexico, “¿Me da…?” or “¿Me das…?” is common when ordering. Add “por favor” to sound polite.',
      },
      {
        speaker: 'Taquero',
        line: '¿Con todo?',
        translation: 'With everything on them?',
        prompt: 'You want onion and cilantro. Choose the natural answer.',
        options: ['Sí, con todo, por favor.', 'Sí, estoy todo.', 'No, soy cebolla.'],
        correct: 'Sí, con todo, por favor.',
        explanation: '“Con todo” usually means with the standard toppings, often onion, cilantro, and salsa.',
        tip: 'If you do not want a topping, say “sin cebolla” (no onion) or “sin cilantro” (no cilantro).',
      },
      {
        speaker: 'Taquero',
        line: '¿Algo más?',
        translation: 'Anything else?',
        prompt: 'That is all. What is a natural response?',
        options: ['Nada más, gracias.', 'Nada nunca.', 'No más tengo.'],
        correct: 'Nada más, gracias.',
        explanation: '“Nada más, gracias” means “Nothing else, thanks.”',
        tip: 'This phrase works in restaurants, shops, cafés, and markets.',
      },
    ],
  },
  {
    scene: 'Meeting a friend',
    location: '👋 Casual conversation',
    dialogue: [
      {
        speaker: 'Friend',
        line: '¡Qué onda! ¿Cómo estás?',
        translation: 'Hey! How are you?',
        prompt: 'Reply casually that you are doing well.',
        options: ['¡Todo bien! ¿Y tú?', 'Yo soy bien.', 'Estoy bueno y tú.'],
        correct: '¡Todo bien! ¿Y tú?',
        explanation: '“¡Todo bien! ¿Y tú?” is a friendly, natural reply.',
        tip: '“¿Qué onda?” is informal. Use it with friends or people around your age, not in every formal situation.',
      },
      {
        speaker: 'Friend',
        line: '¿Qué hiciste el fin de semana?',
        translation: 'What did you do over the weekend?',
        prompt: 'Say that you went out with friends.',
        options: ['Salí con mis amigos.', 'Fui afuera mis amigos.', 'Hice con amigos salir.'],
        correct: 'Salí con mis amigos.',
        explanation: '“Salí con mis amigos” means “I went out with my friends.”',
        tip: '“Salir” can mean to go out socially, including meeting friends or going to a bar.',
      },
      {
        speaker: 'Friend',
        line: '¡Qué padre! Hay que salir otra vez.',
        translation: 'That’s awesome! We should go out again.',
        prompt: 'Agree enthusiastically using a common Mexican expression.',
        options: ['¡Va, jalo!', 'Yo camino.', 'Estoy de acuerdo contigo salir.'],
        correct: '¡Va, jalo!',
        explanation: '“¡Va!” means “okay / sounds good”; “¡jalo!” informally means “I’m in.”',
        tip: '“Jalo” is very informal and familiar. “¡Va!” is broadly useful and less slangy.',
      },
    ],
  },
  {
    scene: 'Ordering at a café',
    location: '☕ Cafetería',
    dialogue: [
      { speaker: 'Barista', line: '¡Hola! ¿Qué te gustaría tomar?', translation: 'Hi! What would you like to drink?', prompt: 'Order a coffee politely.', options: ['Me gustaría un café, por favor.', 'Soy café por favor.', 'Quiero de tomar café yo.'], correct: 'Me gustaría un café, por favor.', explanation: '“Me gustaría…” is a polite way to order. “Quisiera…” also works.', tip: 'In a casual café you can also say “¿Me das un café, por favor?”.' },
      { speaker: 'Barista', line: '¿Lo quieres frío o caliente?', translation: 'Would you like it cold or hot?', prompt: 'Say you want it hot.', options: ['Caliente, por favor.', 'Tengo caliente.', 'Sí, quiero calor.'], correct: 'Caliente, por favor.', explanation: '“Caliente” means hot. “Frío” means cold.', tip: 'For iced coffee, you can ask for “un café frío” or “un café con hielo”.' },
      { speaker: 'Barista', line: '¿Algo más? Tenemos pan dulce.', translation: 'Anything else? We have sweet bread.', prompt: 'Ask how much the total is.', options: ['¿Cuánto es en total?', '¿Cuándo es total?', '¿Dónde cuesta total?'], correct: '¿Cuánto es en total?', explanation: '“¿Cuánto es en total?” asks for the total price.', tip: '“Pan dulce” is a common name for Mexican sweet pastries.' },
    ],
  },
  {
    scene: 'Buying something at a market', location: '🥑 Mercado',
    dialogue: [
      { speaker: 'Vendor', line: '¿Qué va a llevar?', translation: 'What would you like to buy?', prompt: 'Ask for half a kilo of avocados.', options: ['Me da medio kilo de aguacate, por favor.', 'Soy medio kilo aguacate.', 'Llevo aguacate mitad.'], correct: 'Me da medio kilo de aguacate, por favor.', explanation: '“Medio kilo” means half a kilogram.', tip: '“¿Me da…?” is useful with market vendors.' },
      { speaker: 'Vendor', line: '¿Algo más?', translation: 'Anything else?', prompt: 'Ask the price for everything.', options: ['¿Cuánto es por todo?', '¿Cuánto tengo todo?', '¿Qué es por todo?'], correct: '¿Cuánto es por todo?', explanation: '“Por todo” means for everything together.', tip: 'You may also hear “¿Cuánto sería?”.' },
      { speaker: 'Vendor', line: 'Son cuarenta pesos.', translation: 'That will be forty pesos.', prompt: 'Say you will pay in cash.', options: ['Le pago en efectivo.', 'Pago con efectivo soy.', 'Tengo pago efectivo.'], correct: 'Le pago en efectivo.', explanation: '“En efectivo” means in cash.', tip: '“¿Acepta tarjeta?” asks whether they accept cards.' },
    ],
  },
  {
    scene: 'Taking a taxi or ride app', location: '🚕 Transporte',
    dialogue: [
      { speaker: 'Driver', line: '¿A dónde vamos?', translation: 'Where are we going?', prompt: 'Say you are going downtown.', options: ['Voy al centro, por favor.', 'Estoy centro voy.', 'Quiero en centro.'], correct: 'Voy al centro, por favor.', explanation: '“Voy al…” means “I’m going to the…”.', tip: 'You can name your destination after “Voy a…”.' },
      { speaker: 'Driver', line: '¿Por aquí está bien?', translation: 'Is it okay here?', prompt: 'Tell the driver this spot is fine.', options: ['Aquí está bien, gracias.', 'Aquí soy bueno.', 'Está aquí de bien.'], correct: 'Aquí está bien, gracias.', explanation: 'This is a natural way to say the location works for you.', tip: '“¿Me puede dejar aquí?” means “Can you drop me off here?”.' },
      { speaker: 'Driver', line: 'Serían ciento veinte pesos.', translation: 'That will be 120 pesos.', prompt: 'Ask if you can pay by card.', options: ['¿Puedo pagar con tarjeta?', '¿Puedo tarjeta pagarme?', '¿Dónde es tarjeta?'], correct: '¿Puedo pagar con tarjeta?', explanation: '“¿Puedo…?” means “Can I…?”.', tip: 'Confirm the payment method before the ride if needed.' },
    ],
  },
  {
    scene: 'Looking for a room to rent', location: '🏠 Renta',
    dialogue: [
      { speaker: 'Landlord', line: '¿Qué tipo de lugar buscas?', translation: 'What kind of place are you looking for?', prompt: 'Say you are looking for a room to rent.', options: ['Busco un cuarto en renta.', 'Busco renta cuarto soy.', 'Quiero habitación rentar en.'], correct: 'Busco un cuarto en renta.', explanation: '“Cuarto en renta” means a room for rent.', tip: '“Departamento” is apartment; “cuarto” is a room.' },
      { speaker: 'Landlord', line: 'La renta es de cinco mil al mes.', translation: 'Rent is five thousand per month.', prompt: 'Ask whether utilities are included.', options: ['¿Incluye los servicios?', '¿Incluye yo servicio?', '¿Dónde son los servicios?'], correct: '¿Incluye los servicios?', explanation: '“Servicios” can mean utilities such as water and electricity.', tip: 'Ask specifically whether water, electricity, and internet are included.' },
      { speaker: 'Landlord', line: 'Puedes venir a verlo mañana.', translation: 'You can come see it tomorrow.', prompt: 'Ask what time you can visit.', options: ['¿A qué hora puedo ir?', '¿Qué hora puedo voy?', '¿Cuándo hora visitar?'], correct: '¿A qué hora puedo ir?', explanation: '“¿A qué hora…?” asks what time something happens.', tip: '“¿Me puedes mandar la ubicación?” asks for the location pin.' },
    ],
  },
  {
    scene: 'Meeting people at a party', location: '🎉 Fiesta',
    dialogue: [
      { speaker: 'Guest', line: '¡Hola! ¿Cómo te llamas?', translation: 'Hi! What is your name?', prompt: 'Introduce yourself and say nice to meet you.', options: ['Me llamo Alex. Mucho gusto.', 'Yo nombre Alex gusto.', 'Soy llamo Alex.'], correct: 'Me llamo Alex. Mucho gusto.', explanation: '“Me llamo…” means “My name is…”.', tip: 'Replace Alex with your own name.' },
      { speaker: 'Guest', line: '¿De dónde eres?', translation: 'Where are you from?', prompt: 'Say you are from Canada.', options: ['Soy de Canadá.', 'Estoy Canadá.', 'Vengo en Canadá soy.'], correct: 'Soy de Canadá.', explanation: 'Use “Soy de…” to say where you are from.', tip: 'Change the country to your own.' },
      { speaker: 'Guest', line: '¿Quieres ir por algo de tomar?', translation: 'Want to get something to drink?', prompt: 'Agree casually using a common Mexican expression.', options: ['¡Sí, va! Vamos.', 'Sí, voy de tomar algo yo.', 'Estoy de acuerdo ir por.'], correct: '¡Sí, va! Vamos.', explanation: '“¡Va!” is a common casual way to say “sure / sounds good”.', tip: '“¡Jalo!” is even more informal and means “I’m in”.' },
    ],
  },
];


const questions = [
  {
    phrase: '¡Qué padre!',
    question: 'What does “¡Qué padre!” mean?',
    options: ['That’s awesome!', 'I am tired', 'Be careful', 'Good morning'],
    correct: 'That’s awesome!',
    example: '¡Qué padre está tu departamento!',
  },
  {
    phrase: 'No manches',
    question: 'What does “No manches” mean?',
    options: ['Excuse me', 'No way! / You’re kidding!', 'See you later', 'I am hungry'],
    correct: 'No way! / You’re kidding!',
    example: '¿Ganaste un viaje? ¡No manches!',
  },
  {
    phrase: '¡Aguas!',
    question: 'What does “¡Aguas!” mean?',
    options: ['Good luck!', 'Let’s go!', 'Watch out!', 'Cheers!'],
    correct: 'Watch out!',
    example: '¡Aguas! Viene un coche.',
  },
  {
    phrase: '¿Qué onda?',
    question: 'What does “¿Qué onda?” mean?',
    options: ['What time is it?', 'What’s up?', 'Where is it?', 'How much is it?'],
    correct: 'What’s up?',
    example: '¡Hola! ¿Qué onda?',
  },
  {
    phrase: '¡Sale!',
    question: 'What does “¡Sale!” often mean in Mexico?',
    options: ['It’s expensive', 'I don’t know', 'Okay! / Sounds good!', 'I’m leaving forever'],
    correct: 'Okay! / Sounds good!',
    example: '—¿Nos vemos a las ocho? —¡Sale!',
  },
];


const categoryQuestions = {
  basics: questions,
  slang: [
    {
      phrase: '¡Está cañón!',
      question: 'What does “¡Está cañón!” mean?',
      options: ['It is difficult or intense', 'It is delicious', 'It is nearby', 'It is boring'],
      correct: 'It is difficult or intense',
      example: 'El examen estuvo cañón.',
    },
    {
      phrase: 'Chamba',
      question: 'What does “chamba” mean?',
      options: ['Food', 'Work or job', 'Money', 'A party'],
      correct: 'Work or job',
      example: 'Tengo mucha chamba hoy.',
    },
    {
      phrase: '¡Qué gacho!',
      question: 'What does “¡Qué gacho!” mean?',
      options: ['How nice!', 'How awful or mean!', 'How funny!', 'How expensive!'],
      correct: 'How awful or mean!',
      example: '¡Qué gacho que no te invitaron!',
    },
    {
      phrase: '¡Qué padre!',
      question: 'What does “¡Qué padre!” mean?',
      options: ['That’s awesome!', 'That’s terrible!', 'I am tired', 'See you tomorrow'],
      correct: 'That’s awesome!',
      example: '¡Qué padre está tu bicicleta!',
    },
    {
      phrase: 'Fresa',
      question: 'What does “fresa” mean in Mexican slang?',
      options: ['A strawberry only', 'A preppy or snobbish person', 'A police officer', 'A close friend'],
      correct: 'A preppy or snobbish person',
      example: 'No seas tan fresa, vamos al mercado.',
    },
    {
      phrase: '¡Está padre!',
      question: 'What does “Está padre” mean?',
      options: ['It’s cool or nice', 'It’s broken', 'It’s very far', 'It’s too late'],
      correct: 'It’s cool or nice',
      example: 'El concierto estuvo muy padre.',
    },
  ],
  street: [
    {
      phrase: '¿Qué rollo?',
      question: 'What does “¿Qué rollo?” mean?',
      options: ['What’s up?', 'What is that smell?', 'Where are you going?', 'How old are you?'],
      correct: 'What’s up?',
      example: '¡Qué rollo, amigo!',
    },
    {
      phrase: 'Ahorita',
      question: 'What can “ahorita” mean in Mexico?',
      options: ['Only exactly now', 'Now, soon, or later depending on context', 'Yesterday', 'Never'],
      correct: 'Now, soon, or later depending on context',
      example: 'Ahorita voy.',
    },
    {
      phrase: '¡Ni modo!',
      question: 'What does “¡Ni modo!” mean?',
      options: ['No problem!', 'That’s too bad / It can’t be helped', 'Hurry up!', 'Of course!'],
      correct: 'That’s too bad / It can’t be helped',
      example: 'Se canceló el plan. ¡Ni modo!',
    },
    {
      phrase: '¡Aguas!',
      question: 'What does “¡Aguas!” mean in Mexican Spanish?',
      options: ['Watch out!', 'Drink some water!', 'Come here!', 'Calm down!'],
      correct: 'Watch out!',
      example: '¡Aguas con el escalón!',
    },
    {
      phrase: 'La lana',
      question: 'What does “la lana” mean in Mexican slang?',
      options: ['Wool', 'Money', 'A jacket', 'A problem'],
      correct: 'Money',
      example: 'No traigo lana para salir hoy.',
    },
    {
      phrase: '¡No manches!',
      question: 'What does “¡No manches!” usually express?',
      options: ['Surprise or disbelief', 'Hunger', 'Sleepiness', 'Permission'],
      correct: 'Surprise or disbelief',
      example: '¡No manches! ¿Ya terminaste el proyecto?',
    },
  ],
};
const phraseGuides: Record<string, { meaning: string; whenToUse: string; nuance: string; exampleTranslation: string }> = {
  '¡Qué padre!': {
    meaning: 'A casual way to say something is cool, great, or awesome.',
    whenToUse: 'Use it to react positively to plans, places, objects, or good news.',
    nuance: 'Very common in Mexico. It is informal and friendly, not about someone’s father in this expression.',
    exampleTranslation: 'Your apartment is so cool!',
  },
  'No manches': {
    meaning: 'Shows surprise, disbelief, or mild frustration — like “No way!”',
    whenToUse: 'Use it with friends when something is surprising, impressive, or hard to believe.',
    nuance: 'Informal. “No mames” is stronger and more vulgar; “no manches” is the softer alternative.',
    exampleTranslation: 'You won a trip? No way!',
  },
  '¡Aguas!': {
    meaning: 'A quick warning meaning “Watch out!” or “Careful!”',
    whenToUse: 'Say it when someone may bump into something, trip, or face a nearby hazard.',
    nuance: 'This is a warning, not usually a request to drink water.',
    exampleTranslation: 'Watch out! There’s a car coming.',
  },
  '¿Qué onda?': {
    meaning: 'An informal greeting similar to “What’s up?”',
    whenToUse: 'Use it with friends, peers, or people you know in casual situations.',
    nuance: 'Friendly and informal; avoid it in very formal situations or official emails.',
    exampleTranslation: 'Hey! What’s up?',
  },
  '¡Sale!': {
    meaning: 'A casual way to agree: “Okay!”, “Sounds good!”, or “Deal!”',
    whenToUse: 'Use it to confirm plans or accept a suggestion.',
    nuance: 'Tone matters: it can sound relaxed and natural when making plans with friends.',
    exampleTranslation: '—See you at eight? —Sounds good!',
  },
  '¡Está cañón!': {
    meaning: 'Something is tough, intense, impressive, or extreme.',
    whenToUse: 'Use it to describe a difficult exam, a stressful day, or an intense situation.',
    nuance: 'The exact meaning depends on context; it can describe something difficult or something impressive.',
    exampleTranslation: 'The exam was really tough.',
  },
  'Chamba': {
    meaning: 'Informal Mexican Spanish for work or a job.',
    whenToUse: 'Use it in casual conversation about your job, workload, or finding work.',
    nuance: 'Informal, but widely understood. “Trabajo” is more neutral.',
    exampleTranslation: 'I have a lot of work today.',
  },
  '¡Qué gacho!': {
    meaning: 'Means something is awful, unfair, mean, or unfortunate.',
    whenToUse: 'Use it to react when someone behaves badly or something disappointing happens.',
    nuance: 'Informal and expressive; it can criticize a situation or a person’s behavior.',
    exampleTranslation: 'That’s so mean that they didn’t invite you!',
  },
  'Fresa': {
    meaning: 'Slang for someone seen as preppy, posh, or snobbish.',
    whenToUse: 'Use it when talking casually about a style, attitude, or social stereotype.',
    nuance: 'Can be teasing or insulting depending on tone. Literally, it also means “strawberry.”',
    exampleTranslation: 'Don’t be so posh; let’s go to the market.',
  },
  '¡Está padre!': {
    meaning: 'Means “It’s cool”, “It’s nice”, or “That’s great.”',
    whenToUse: 'Use it to give a positive opinion about an event, object, or experience.',
    nuance: 'A very natural, informal compliment in Mexico.',
    exampleTranslation: 'The concert was really cool.',
  },
  '¿Qué rollo?': {
    meaning: 'A relaxed greeting similar to “What’s up?” or “What’s going on?”',
    whenToUse: 'Use it with friends and people in casual social settings.',
    nuance: 'Informal. It is not a literal question about a roll or object.',
    exampleTranslation: 'What’s up, friend?',
  },
  'Ahorita': {
    meaning: 'Depending on context, it can mean right now, very soon, or an indefinite later.',
    whenToUse: 'Listen for context and tone; if timing matters, ask “¿En cuánto tiempo?”',
    nuance: 'It is famously flexible in Mexico. Never assume it always means “this exact second.”',
    exampleTranslation: 'I’ll be there in a bit. (The exact timing depends on context.)',
  },
  '¡Ni modo!': {
    meaning: 'Means “Oh well”, “That’s how it is”, or “It can’t be helped.”',
    whenToUse: 'Use it when accepting a disappointing situation you cannot change.',
    nuance: 'It can express resignation, acceptance, or moving on after a setback.',
    exampleTranslation: 'The plan got cancelled. Oh well.',
  },
  'La lana': {
    meaning: 'Informal slang for money.',
    whenToUse: 'Use it in casual conversations about paying, spending, or being short on cash.',
    nuance: '“Lana” literally means wool, but in this expression it means money.',
    exampleTranslation: 'I don’t have money to go out today.',
  },
  '¡No manches!': {
    meaning: 'Expresses surprise or disbelief, like “Seriously?” or “No way!”',
    whenToUse: 'Use it as a reaction to unexpected news or something hard to believe.',
    nuance: 'Very common in casual Mexican Spanish; the stronger “no mames” is vulgar.',
    exampleTranslation: 'No way! You already finished the project?',
  },
};

type FreePracticeTurn = {
  speaker: string;
  spanishLine: string;
  englishMeaning: string;
  prompt: string;
  sample: string;
  tip: string;
  keywords: string[];
};

type FreePracticeScenario = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  turns: FreePracticeTurn[];
};

const freePracticeScenarios: FreePracticeScenario[] = [
  {
    id: 'taqueria',
    title: 'At a taco stand',
    emoji: '🌮',
    description: 'Order food and answer the taquero naturally.',
    turns: [
      { speaker: 'Taquero', spanishLine: '¡Buenas! ¿Qué te damos?', englishMeaning: 'Hi! What can I get you?', prompt: 'Order three tacos politely in Spanish.', sample: 'Me da tres tacos, por favor.', tip: '“¿Me da…?” is a natural, polite way to order.', keywords: ['tacos', 'me da', 'por favor'] },
      { speaker: 'Taquero', spanishLine: '¿Con todo?', englishMeaning: 'With all the usual toppings?', prompt: 'Say yes and ask for everything.', sample: 'Sí, con todo, por favor.', tip: '“Con todo” usually means the standard toppings, often onion, cilantro and salsa.', keywords: ['con todo'] },
      { speaker: 'Taquero', spanishLine: '¿Algo más?', englishMeaning: 'Anything else?', prompt: 'Tell them that is all and thank them.', sample: 'Nada más, gracias.', tip: '“Nada más, gracias” works in restaurants, shops and markets.', keywords: ['nada más', 'nada mas'] },
    ],
  },
  {
    id: 'friends',
    title: 'Meeting a friend',
    emoji: '👋',
    description: 'Greet a friend and make plans.',
    turns: [
      { speaker: 'Friend', spanishLine: '¡Qué onda! ¿Cómo estás?', englishMeaning: 'Hey! What’s up? How are you?', prompt: 'Reply casually that you are doing well and ask back.', sample: '¡Todo bien! ¿Y tú?', tip: '“¿Qué onda?” is informal and common among friends.', keywords: ['todo bien', 'bien'] },
      { speaker: 'Friend', spanishLine: '¿Qué hiciste el fin de semana?', englishMeaning: 'What did you do over the weekend?', prompt: 'Say that you went out with your friends.', sample: 'Salí con mis amigos.', tip: '“Salir” can mean going out socially with friends.', keywords: ['salí', 'sali', 'amigos'] },
      { speaker: 'Friend', spanishLine: 'Hay que salir otra vez.', englishMeaning: 'We should go out again.', prompt: 'Agree using a natural Mexican expression.', sample: '¡Va, jalo!', tip: '“¡Va!” means okay; “¡jalo!” means I’m in. Both are casual.', keywords: ['va', 'jalo'] },
    ],
  },
  {
    id: 'getting_around',
    title: 'Getting around town',
    emoji: '🚌',
    description: 'Ask for help while exploring Mexico.',
    turns: [
      { speaker: 'Local', spanishLine: '¿Buscas algo?', englishMeaning: 'Are you looking for something?', prompt: 'Ask where the nearest bus stop is.', sample: 'Sí, ¿dónde está la parada de camión más cercana?', tip: '“¿Dónde está…?” is a useful way to ask where something is.', keywords: ['dónde', 'donde', 'parada', 'camión', 'camion'] },
      { speaker: 'Local', spanishLine: 'Está a dos cuadras, por allá.', englishMeaning: 'It’s two blocks away, over there.', prompt: 'Thank the person politely.', sample: 'Muchas gracias por la ayuda.', tip: '“Muchas gracias” is polite and works in any situation.', keywords: ['gracias'] },
      { speaker: 'Local', spanishLine: '¡De nada!', englishMeaning: 'You’re welcome!', prompt: 'Say goodbye in a friendly way.', sample: '¡Que tengas buen día!', tip: '“Que tengas buen día” is a friendly way to wish someone a good day.', keywords: ['buen día', 'buen dia', 'hasta luego', 'gracias'] },
    ],
  },
  {
    id: 'cafe', title: 'At a café', emoji: '☕', description: 'Order a drink, choose hot or iced, and ask for the total.',
    turns: [
      { speaker: 'Barista', spanishLine: '¡Hola! ¿Qué te gustaría tomar?', englishMeaning: 'Hi! What would you like to drink?', prompt: 'Order a coffee politely.', sample: 'Me gustaría un café, por favor.', tip: '“Me gustaría…” is polite. You can also say “Quisiera un café”.', keywords: ['cafe', 'café', 'me gustaría', 'quisiera', 'por favor'] },
      { speaker: 'Barista', spanishLine: '¿Lo quieres frío o caliente?', englishMeaning: 'Would you like it iced or hot?', prompt: 'Say you want it hot.', sample: 'Caliente, por favor.', tip: '“Frío” means cold and “caliente” means hot.', keywords: ['caliente'] },
      { speaker: 'Barista', spanishLine: '¿Algo más? Tenemos pan dulce.', englishMeaning: 'Anything else? We have sweet bread.', prompt: 'Ask how much everything costs.', sample: '¿Cuánto es en total?', tip: '“Pan dulce” refers to Mexican sweet pastries.', keywords: ['cuánto', 'cuanto', 'total', 'cuesta'] },
    ],
  },
  {
    id: 'market', title: 'At a market', emoji: '🥑', description: 'Buy produce, ask prices, and pay.',
    turns: [
      { speaker: 'Vendor', spanishLine: '¿Qué va a llevar?', englishMeaning: 'What would you like to buy?', prompt: 'Ask for half a kilo of avocados.', sample: 'Me da medio kilo de aguacate, por favor.', tip: '“Medio kilo” means half a kilogram.', keywords: ['medio kilo', 'aguacate', 'me da'] },
      { speaker: 'Vendor', spanishLine: '¿Algo más?', englishMeaning: 'Anything else?', prompt: 'Ask how much it is for everything.', sample: '¿Cuánto es por todo?', tip: '“¿Cuánto sería?” is another natural way to ask the price.', keywords: ['cuánto', 'cuanto', 'por todo', 'sería', 'seria'] },
      { speaker: 'Vendor', spanishLine: 'Son cuarenta pesos.', englishMeaning: 'That will be forty pesos.', prompt: 'Say you will pay in cash.', sample: 'Le pago en efectivo.', tip: '“En efectivo” means in cash. “¿Acepta tarjeta?” asks about cards.', keywords: ['efectivo', 'cash'] },
    ],
  },
  {
    id: 'taxi', title: 'Taxi or ride app', emoji: '🚕', description: 'Tell the driver your destination and ask to stop.',
    turns: [
      { speaker: 'Driver', spanishLine: '¿A dónde vamos?', englishMeaning: 'Where are we going?', prompt: 'Say you are going downtown.', sample: 'Voy al centro, por favor.', tip: 'Use “Voy a…” before your destination.', keywords: ['centro', 'voy a', 'voy al'] },
      { speaker: 'Driver', spanishLine: '¿Por aquí está bien?', englishMeaning: 'Is it okay here?', prompt: 'Tell the driver this spot is fine.', sample: 'Aquí está bien, gracias.', tip: '“¿Me puede dejar aquí?” means “Can you drop me off here?”.', keywords: ['aquí', 'aqui', 'está bien', 'esta bien'] },
      { speaker: 'Driver', spanishLine: 'Serían ciento veinte pesos.', englishMeaning: 'That will be 120 pesos.', prompt: 'Ask if you can pay by card.', sample: '¿Puedo pagar con tarjeta?', tip: 'Confirm the payment method before the ride if needed.', keywords: ['tarjeta', 'pagar con'] },
    ],
  },
  {
    id: 'rent', title: 'Looking for a room', emoji: '🏠', description: 'Ask about rent, utilities, and visiting a room.',
    turns: [
      { speaker: 'Landlord', spanishLine: '¿Qué tipo de lugar buscas?', englishMeaning: 'What kind of place are you looking for?', prompt: 'Say you are looking for a room to rent.', sample: 'Busco un cuarto en renta.', tip: '“Cuarto” means room; “departamento” means apartment.', keywords: ['busco', 'cuarto', 'renta'] },
      { speaker: 'Landlord', spanishLine: 'La renta es de cinco mil al mes.', englishMeaning: 'Rent is five thousand per month.', prompt: 'Ask whether utilities are included.', sample: '¿Incluye los servicios?', tip: 'Ask whether water, electricity, and internet are included.', keywords: ['incluye', 'servicios', 'agua', 'luz', 'internet'] },
      { speaker: 'Landlord', spanishLine: 'Puedes venir a verlo mañana.', englishMeaning: 'You can come see it tomorrow.', prompt: 'Ask what time you can visit.', sample: '¿A qué hora puedo ir?', tip: '“¿Me mandas la ubicación?” asks them to send the location.', keywords: ['qué hora', 'que hora', 'a qué hora', 'a que hora', 'puedo ir'] },
    ],
  },
  {
    id: 'party', title: 'Meeting people at a party', emoji: '🎉', description: 'Introduce yourself and make a friendly connection.',
    turns: [
      { speaker: 'Guest', spanishLine: '¡Hola! ¿Cómo te llamas?', englishMeaning: 'Hi! What is your name?', prompt: 'Introduce yourself and say nice to meet you.', sample: 'Me llamo Alex. Mucho gusto.', tip: 'Replace Alex with your own name.', keywords: ['me llamo', 'mucho gusto', 'soy'] },
      { speaker: 'Guest', spanishLine: '¿De dónde eres?', englishMeaning: 'Where are you from?', prompt: 'Say you are from Canada.', sample: 'Soy de Canadá.', tip: 'Use “Soy de…” for your country or city of origin.', keywords: ['soy de', 'vengo de'] },
      { speaker: 'Guest', spanishLine: '¿Quieres ir por algo de tomar?', englishMeaning: 'Do you want to get something to drink?', prompt: 'Accept casually.', sample: '¡Sí, va! Gracias.', tip: '“¡Va!” is a common casual way to say “Okay / sounds good”.', keywords: ['va', 'sí', 'si', 'claro', 'jalo'] },
    ],
  },
];

function normalizePracticeText(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡!¿?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type PracticeEvaluation = { accepted: boolean; feedback: string };

// Local, transparent phrase matching: no text is sent to an external service.
// Each list contains natural alternatives that communicate the task's intent.
const acceptedReplyVariants: Record<string, string[]> = {
  'taqueria:0': ['me da tres tacos', 'deme tres tacos', 'quiero tres tacos', 'quisiera tres tacos', 'tres tacos por favor', 'me puede dar tres tacos'],
  'taqueria:1': ['si con todo', 'con todo por favor', 'si todo', 'con todo', 'con cebolla y cilantro'],
  'taqueria:2': ['nada mas gracias', 'seria todo gracias', 'eso es todo gracias', 'no gracias eso es todo', 'ya con eso gracias'],
  'friends:0': ['todo bien y tu', 'bien gracias y tu', 'muy bien y tu', 'todo chido y tu', 'bien todo bien'],
  'friends:1': ['sali con mis amigos', 'fui a salir con mis amigos', 'estuve con mis amigos', 'fui de fiesta con mis amigos', 'pase el fin de semana con mis amigos'],
  'friends:2': ['va jalo', 'si jalo', 'va me late', 'claro vamos', 'sale va', 'arre jalo', 'jalo'],
  'getting_around:0': ['donde esta la parada', 'donde queda la parada', 'donde esta la parada de camion', 'como llego a la parada', 'busco la parada de camion'],
  'getting_around:1': ['muchas gracias', 'gracias por la ayuda', 'te lo agradezco', 'mil gracias', 'muchas gracias por ayudarme'],
  'getting_around:2': ['hasta luego', 'que tengas buen dia', 'buen dia gracias', 'nos vemos', 'que te vaya bien'],
  'cafe:0': ['me gustaria un cafe', 'quisiera un cafe', 'me da un cafe', 'quiero un cafe por favor', 'me puede dar un cafe', 'un cafe por favor', 'me gustaria un latte', 'quisiera un americano', 'me das un cafe', 'me podria dar un cafe', 'para mi un cafe', 'voy a querer un cafe', 'me regala un cafe', 'un americano por favor', 'quiero un latte', 'me gustaria un cafe por favor'],
  'cafe:1': ['caliente por favor', 'lo quiero caliente', 'que sea caliente', 'caliente', 'prefiero caliente', 'mejor caliente', 'lo quiero caliente por favor', 'calientito por favor'],
  'cafe:2': ['cuanto es en total', 'cuanto seria todo', 'cuanto cuesta todo', 'cuanto es', 'cuanto te debo', 'cuanto seria', 'cuanto cuesta', 'cuanto seria en total', 'cuanto le debo', 'cuanto es todo', 'me dice cuanto es', 'cuanto va a ser'],
  'market:0': ['medio kilo de aguacate', 'me da medio kilo de aguacate', 'quisiera medio kilo de aguacates', 'deme medio kilo de aguacate', 'quiero medio kilo de aguacate'],
  'market:1': ['cuanto es por todo', 'cuanto seria por todo', 'cuanto le debo', 'cuanto cuesta todo', 'cuanto es en total', 'cuanto seria'],
  'market:2': ['le pago en efectivo', 'pago en efectivo', 'voy a pagar en efectivo', 'en efectivo', 'traigo efectivo'],
  'taxi:0': ['voy al centro', 'al centro por favor', 'quiero ir al centro', 'me lleva al centro', 'vamos al centro'],
  'taxi:1': ['aqui esta bien', 'aqui esta perfecto', 'me puede dejar aqui', 'puede dejarme aqui', 'aqui por favor', 'aqui esta bien gracias'],
  'taxi:2': ['puedo pagar con tarjeta', 'acepta tarjeta', 'se puede pagar con tarjeta', 'puedo pagar con tarjeta de credito', 'aceptas tarjeta'],
  'rent:0': ['busco un cuarto en renta', 'estoy buscando un cuarto', 'busco una habitacion en renta', 'quiero rentar un cuarto', 'busco un cuarto para rentar'],
  'rent:1': ['incluye los servicios', 'estan incluidos los servicios', 'incluye agua luz e internet', 'la renta incluye servicios', 'se incluyen los servicios', 'incluye agua y luz'],
  'rent:2': ['a que hora puedo ir', 'cuando puedo ir a verlo', 'a que hora puedo visitarlo', 'puedo ir mañana a verlo', 'que hora te queda bien', 'a que hora puedo pasar'],
  'party:0': ['me llamo', 'soy', 'mucho gusto', 'hola me llamo', 'que gusto conocerte'],
  'party:1': ['soy de canada', 'vengo de canada', 'soy canadiense', 'vengo de', 'soy de'],
  'party:2': ['si va gracias', 'claro vamos', 'si claro', 'va jalo', 'si me late', 'jalo', 'por supuesto'],
};

function evaluatePracticeReply(scenarioId: string, turnIndex: number, turn: FreePracticeTurn, response: string): PracticeEvaluation {
  const answer = normalizePracticeText(response);
  if (!answer) return { accepted: false, feedback: 'Write a short reply in Spanish to try again.' };

  const variants = acceptedReplyVariants[`${scenarioId}:${turnIndex}`] ?? [];
  // First, look for a full natural phrase. Requiring a reasonably complete
  // phrase avoids accepting a reply just because it contains one generic word.
  const variantMatch = variants.some((phrase) => {
    const normalizedPhrase = normalizePracticeText(phrase);
    return answer === normalizedPhrase || answer.includes(normalizedPhrase);
  });

  const words = answer.split(' ').filter((word) => word.length > 2);
  const normalizedKeywords = turn.keywords.map(normalizePracticeText).filter((word) => word.length > 3);
  const keywordHits = normalizedKeywords.filter((word) => answer.includes(word)).length;
  // Keyword fallback requires two distinct cues; one shared word (e.g. “café”)
  // alone is not enough to count as completing the task.
  const keywordMatch = keywordHits >= 2 && words.length >= 2;
  const accepted = variantMatch || keywordMatch;

  let feedback: string;
  if (accepted) {
    feedback = 'Your reply matches the task. Mexican Spanish has several natural ways to express the same idea; compare your wording with the example below.';
  } else if (keywordHits === 1) {
    feedback = 'You mentioned something relevant, but the reply may not complete the task yet. Try adding the action or detail requested in the prompt, then compare with the example.';
  } else {
    feedback = 'I could not confidently match your reply to the task. It may be understandable, but try answering the specific question and including the main action or detail requested. You can use the hint if you need it.';
  }

  return { accepted, feedback };
}

function getScenarioPriority(
  scenarioId: string,
  goal: string,
  interest: string,
): number {
  // Lower score means this scenario should appear earlier.
  if (interest === 'food' && scenarioId === 'taqueria') return 0;
  if (interest === 'transport' && scenarioId === 'getting_around') return 0;
  if ((interest === 'everyday' || interest === 'slang') && scenarioId === 'friends') return 0;

  if (goal === 'travel') {
    if (scenarioId === 'getting_around') return 1;
    if (scenarioId === 'taqueria') return 2;
  }
  if (goal === 'living') {
    if (scenarioId === 'getting_around') return 1;
    if (scenarioId === 'friends') return 2;
  }
  if (goal === 'friends' || goal === 'nightlife') {
    if (scenarioId === 'friends') return 1;
  }

  if (scenarioId === 'taqueria') return 3;
  if (scenarioId === 'friends') return 4;
  return 5;
}

function ConfettiPiece({
  emoji,
  delay,
  startX,
}: {
  emoji: string;
  delay: number;
  startX: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 2200,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateY: progress.value * 420 },
      { translateX: Math.sin(progress.value * Math.PI * 3) * 35 },
      { rotate: `${progress.value * 540}deg` },
    ],
  }));

  return (
    <Animated.Text
      style={[
        {
          position: 'absolute',
          top: 0,
          left: startX,
          fontSize: 26,
        },
        animatedStyle,
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

export default function Index() {
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const [bestScore, setBestScore] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [practiceDays, setPracticeDays] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [lastPracticeDate, setLastPracticeDate] = useState('');
  const [firstLessonBadge, setFirstLessonBadge] = useState(false);
  const [showBadgeAnimation, setShowBadgeAnimation] = useState(false);
  const [unlockedBadgeName, setUnlockedBadgeName] = useState('');
  const [perfectLessonBadge, setPerfectLessonBadge] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [finished, setFinished] = useState(false);
  const [conversationScenario, setConversationScenario] = useState(0);
  const [conversationStep, setConversationStep] = useState(0);
  const [conversationAnswer, setConversationAnswer] = useState('');
  const [conversationCorrect, setConversationCorrect] = useState(0);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewSelectedAnswer, setReviewSelectedAnswer] = useState('');
  const [freeScenarioIndex, setFreeScenarioIndex] = useState(0);
  const [freeTurnIndex, setFreeTurnIndex] = useState(0);
  const [freeResponse, setFreeResponse] = useState('');
  const [freeSubmitted, setFreeSubmitted] = useState(false);
  const [freeShowHint, setFreeShowHint] = useState(false);
  const [freeSessionXp, setFreeSessionXp] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [learnerLevel, setLearnerLevel] = useState('beginner');
  const [learnerGoal, setLearnerGoal] = useState('travel');
  const [learnerInterest, setLearnerInterest] = useState('food');
  const { category } = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();
  const rewardClaimed = useRef(false);

  useEffect(() => {
    const loadLearnerProfile = async () => {
      try {
        const savedProfile = await AsyncStorage.getItem('mexicanSlangLearnerProfile');
        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          setLearnerLevel(profile.level ?? 'beginner');
          setLearnerGoal(profile.goal ?? 'travel');
          setLearnerInterest(profile.interest ?? 'food');
          setOnboardingComplete(true);
        }
      } catch (error) {
        console.log('Error loading learner profile:', error);
      } finally {
        setProfileLoaded(true);
      }
    };
    loadLearnerProfile();
  }, []);

  async function saveLearnerProfile() {
    const profile = {
      level: learnerLevel,
      goal: learnerGoal,
      interest: learnerInterest,
      updatedAt: new Date().toISOString(),
    };
    try {
      await AsyncStorage.setItem('mexicanSlangLearnerProfile', JSON.stringify(profile));
      setOnboardingComplete(true);
    } catch (error) {
      console.log('Error saving learner profile:', error);
      setOnboardingComplete(true);
    }
  }

  useEffect(() => {
    const loadReviewItems = async () => {
      try {
        const saved = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
        setReviewItems(saved ? JSON.parse(saved) : []);
      } catch (error) {
        console.log('Error al cargar el repaso:', error);
      }
    };
    loadReviewItems();
  }, []);

  async function persistReviewItems(items: ReviewItem[]) {
    setReviewItems(items);
    try {
      await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.log('Error al guardar el repaso:', error);
    }
  }

  useEffect(() => {
    const saveXP = async () => {
      try {
        await AsyncStorage.setItem('mexicanSlangXP', String(xp));
      } catch (error) {
        console.log('Error al guardar XP:', error);
      }
    };

    saveXP();
  }, [xp]);

  useEffect(() => {
    const loadBestScore = async () => {
      try {
        const scoreKey = `mexicanSlangBestScore_${category ?? 'basics'}`;
        const savedScore = await AsyncStorage.getItem(scoreKey);

        if (savedScore !== null) {
          setBestScore(Number(savedScore));
        } else {
          setBestScore(0);
        }
        const lessonKey = `mexicanSlangCompletedLessons_${category ?? 'basics'}`;
        const savedLessons = await AsyncStorage.getItem(lessonKey);

        if (savedLessons !== null) {
          setCompletedLessons(Number(savedLessons));
        } else {
          setCompletedLessons(0);
        }
        const savedBadge = await AsyncStorage.getItem(
          'mexicanSlangFirstLessonBadge'
        );

        setFirstLessonBadge(savedBadge === 'true');
      } catch (error) {
        console.log('Error al cargar la mejor puntuación:', error);
      }
    };

    loadBestScore();
  }, [category]);

  useEffect(() => {
    const loadXP = async () => {
      try {
        const savedXP = await AsyncStorage.getItem('mexicanSlangXP');
        setXp(Number(savedXP ?? 0));
      } catch (error) {
        console.log('Error al cargar XP:', error);
      }
    };

    loadXP();
  }, []);



  useFocusEffect(
    useCallback(() => {
      const loadStreak = async () => {
        try {
          const savedStreak = await AsyncStorage.getItem(
            'mexicanSlangCurrentStreak'
          );
          const savedDate = await AsyncStorage.getItem(
            'mexicanSlangLastPracticeDate'
          );

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const todayString = formatDate(today);
          const yesterdayString = formatDate(yesterday);

          if (savedDate === todayString || savedDate === yesterdayString) {
            setCurrentStreak(Number(savedStreak ?? 0));
            setLastPracticeDate(savedDate ?? '');
          } else {
            setCurrentStreak(0);
            setLastPracticeDate(savedDate ?? '');
            await AsyncStorage.setItem('mexicanSlangCurrentStreak', '0');
          }
        } catch (error) {
          console.log('Error al cargar la racha:', error);
        }
      };

      loadStreak();
    }, [])
  );



  useEffect(() => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer('');
    setFinished(false);
    rewardClaimed.current = false;
  }, [category]);

  
const loadPracticeDays = async () => {
  try {
    const savedDays = await AsyncStorage.getItem(
      'mexicanSlangPracticeDays'
    );
    setPracticeDays(savedDays ? JSON.parse(savedDays) : []);
    const savedCategories = await AsyncStorage.getItem('mexicanSlangCompletedCategories');
    setCompletedCategories(savedCategories ? JSON.parse(savedCategories) : []);
  } catch (error) {
    console.log('Error al cargar los días de práctica:', error);
  }
};

useFocusEffect(
  useCallback(() => {
    loadPracticeDays();
  }, [])
);

const calendarYear = calendarMonth.getFullYear();
const calendarMonthIndex = calendarMonth.getMonth();
const monthName = calendarMonth.toLocaleDateString('es-MX', {
  month: 'long',
  year: 'numeric',
});

const firstWeekday =
  new Date(calendarYear, calendarMonthIndex, 1).getDay();

const daysInMonth =
  new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();

const calendarCells = [
  ...Array(firstWeekday).fill(0),
  ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
];

const calendarDateKey = (day: number) =>
  `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;


  const activeQuestions =
    category === 'slang'
      ? categoryQuestions.slang
      : category === 'street'
        ? categoryQuestions.street
        : categoryQuestions.basics;

  const safeQuestionIndex = Math.min(currentQuestion, activeQuestions.length - 1);
  const question = activeQuestions[
    Math.min(currentQuestion, activeQuestions.length - 1)
  ];


  function chooseAnswer(option: string) {
    if (selectedAnswer !== '') return;

    setSelectedAnswer(option);

    if (option === question.correct) {
      setScore((previous) => previous + 1);
      setXp((previous) => previous + 10);
    } else {
      const categoryName = category ?? 'basics';
      const reviewItem: ReviewItem = {
        id: `${categoryName}:${question.phrase}`,
        category: categoryName,
        phrase: question.phrase,
        question: question.question,
        options: question.options,
        correct: question.correct,
        example: question.example,
        attempts: 0,
        addedAt: Date.now(),
      };
      const existing = reviewItems.find((item) => item.id === reviewItem.id);
      const updated = existing
        ? reviewItems.map((item) =>
            item.id === reviewItem.id
              ? { ...item, attempts: item.attempts + 1 }
              : item
          )
        : [...reviewItems, reviewItem];
      void persistReviewItems(updated);
    }
  }


  async function nextQuestion() {
    if (currentQuestion < activeQuestions.length - 1) {
      setCurrentQuestion((previous) => previous + 1);
      setSelectedAnswer('');
      return;
    }

    if (rewardClaimed.current) return;
    rewardClaimed.current = true;

    const finalScore = score;


    const now = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = formatDate(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = formatDate(yesterdayDate);

    try {
      // Guardar el día de práctica para el calendario
      const savedDays = await AsyncStorage.getItem(
        'mexicanSlangPracticeDays'
      );
      const practiceDays: string[] = savedDays
        ? JSON.parse(savedDays)
        : [];

      if (!practiceDays.includes(today)) {
        practiceDays.push(today);
        await AsyncStorage.setItem(
          'mexicanSlangPracticeDays',
          JSON.stringify(practiceDays)
        );
      }

      // Actualizar la racha una sola vez por día
      if (lastPracticeDate !== today) {
        const newStreak =
          lastPracticeDate === yesterday ? currentStreak + 1 : 1;

        await AsyncStorage.setItem(
          'mexicanSlangCurrentStreak',
          String(newStreak)
        );
        await AsyncStorage.setItem(
          'mexicanSlangLastPracticeDate',
          today
        );

        setCurrentStreak(newStreak);
        setLastPracticeDate(today);
      }
    } catch (error) {
      console.log('Error al guardar calendario o racha:', error);
    }

    // Marcar esta categoría como completada y guardar el progreso de la ruta
    if (category && ['basics', 'slang', 'street'].includes(category)) {
      try {
        const savedCategories = await AsyncStorage.getItem(
          'mexicanSlangCompletedCategories'
        );
        const categories: string[] = savedCategories
          ? JSON.parse(savedCategories)
          : [];

        if (!categories.includes(category)) {
          categories.push(category);
          await AsyncStorage.setItem(
            'mexicanSlangCompletedCategories',
            JSON.stringify(categories)
          );
        }
        setCompletedCategories(categories);
      } catch (error) {
        console.log('Error al guardar el progreso de la ruta:', error);
      }
    }

    if (score === activeQuestions.length && !perfectLessonBadge) {
      try {
        await AsyncStorage.setItem(
          'mexicanSlangPerfectLessonBadge',
          'true'
        );
        setPerfectLessonBadge(true);
        setUnlockedBadgeName('Perfectionist!');
        setShowBadgeAnimation(true);
        console.log('Celebración de Perfectionist activada');
      } catch (error) {
        console.log(
          'Error al guardar la insignia de perfeccionista:',
          error
        );
      }
    }

    const newBestScore = Math.max(bestScore, finalScore);

    try {
      await AsyncStorage.setItem(
        `mexicanSlangBestScore_${category ?? 'basics'}`,
        String(newBestScore)
      );
      setBestScore(newBestScore);
    } catch (error) {
      console.log('Error al guardar la puntuación:', error);
    }

    const lessonKey = `mexicanSlangCompletedLessons_${category ?? 'basics'}`;
    const newCompletedLessons = completedLessons + 1;
    const newXP = xp + 20;
    setXp(newXP);

    try {
      await AsyncStorage.setItem(
        lessonKey,
        String(newCompletedLessons)
      );
      setCompletedLessons(newCompletedLessons);
    } catch (error) {
      console.log('Error al guardar las lecciones completadas:', error);
    }
    if (!firstLessonBadge) {
      console.log('Estado de la primera insignia:', firstLessonBadge);
      try {
        await AsyncStorage.setItem(
          'mexicanSlangFirstLessonBadge',
          'true'
        );
        setFirstLessonBadge(true);
        setUnlockedBadgeName('First Lesson Badge');
        setShowBadgeAnimation(true);
        console.log('Celebración activada');
        console.log('Insignia desbloqueada:', true);

      } catch (error) {
        console.log('Error al guardar la insignia:', error);
      }
    }
    console.log('La lección terminó; mostrando resultados');
    if (finalScore === activeQuestions.length) {
      setUnlockedBadgeName('Perfectionist!');
      setShowBadgeAnimation(true);
    }
    setFinished(true);

  }


  function restartLesson() {
    rewardClaimed.current = false;
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer('');
    setFinished(false);
  }

  
  if (!category) {
    if (!profileLoaded) {
      return (
        <View style={{ flex: 1, backgroundColor: '#F7F7F2', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <Text style={{ fontSize: 38 }}>🇲🇽</Text>
          <Text style={{ color: '#14532D', fontSize: 20, fontWeight: 'bold', marginTop: 12 }}>Getting your learning path ready…</Text>
        </View>
      );
    }

    if (!onboardingComplete) {
      const Choice = ({ title, subtitle, selected, onPress }: { title: string; subtitle?: string; selected: boolean; onPress: () => void }) => (
        <Pressable onPress={onPress} style={{ padding: 14, borderRadius: 14, marginTop: 9, borderWidth: 1.5, borderColor: selected ? '#16A34A' : '#E2E8F0', backgroundColor: selected ? '#F0FDF4' : '#FFFFFF' }}>
          <Text style={{ color: '#14532D', fontSize: 15, fontWeight: '700' }}>{selected ? '✓  ' : ''}{title}</Text>
          {subtitle ? <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 4 }}>{subtitle}</Text> : null}
        </Pressable>
      );

      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#F7F7F2' }} contentContainerStyle={{ paddingBottom: 36 }}>
          <View style={{ backgroundColor: '#14532D', paddingTop: 58, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
            <Text style={{ fontSize: 38 }}>🇲🇽</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 10 }}>Make it your Mexico</Text>
            <Text style={{ color: '#D1FAE5', fontSize: 15, lineHeight: 23, marginTop: 8 }}>A few quick choices help us shape your Mexican Spanish journey.</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 20 }}>
              {[0, 1, 2].map((step) => <View key={step} style={{ height: 5, flex: 1, borderRadius: 5, backgroundColor: '#86EFAC' }} />)}
            </View>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
            <Text style={{ color: '#14532D', fontSize: 20, fontWeight: '800' }}>1. What’s your Spanish level?</Text>
            <Choice title="🌱 Beginner" subtitle="I’m starting from scratch or know a few words." selected={learnerLevel === 'beginner'} onPress={() => setLearnerLevel('beginner')} />
            <Choice title="🧩 I know some Spanish" subtitle="I can understand simple phrases, but need practice." selected={learnerLevel === 'some'} onPress={() => setLearnerLevel('some')} />
            <Choice title="🗣️ Conversational" subtitle="I can get by and want to sound more natural." selected={learnerLevel === 'conversational'} onPress={() => setLearnerLevel('conversational')} />

            <Text style={{ color: '#14532D', fontSize: 20, fontWeight: '800', marginTop: 24 }}>2. What brings you to Mexican Spanish?</Text>
            <Choice title="✈️ Travel around Mexico" subtitle="Order food, ask directions, and handle everyday situations." selected={learnerGoal === 'travel'} onPress={() => setLearnerGoal('travel')} />
            <Choice title="🏡 Live in Mexico" subtitle="Feel confident with daily life and local conversations." selected={learnerGoal === 'living'} onPress={() => setLearnerGoal('living')} />
            <Choice title="🤝 Meet people and make friends" subtitle="Understand greetings, jokes, and casual expressions." selected={learnerGoal === 'friends'} onPress={() => setLearnerGoal('friends')} />
            <Choice title="🎉 Nightlife and going out" subtitle="Learn relaxed phrases for bars, parties, and social plans." selected={learnerGoal === 'nightlife'} onPress={() => setLearnerGoal('nightlife')} />

            <Text style={{ color: '#14532D', fontSize: 20, fontWeight: '800', marginTop: 24 }}>3. What would you like to practice first?</Text>
            <Choice title="🌮 Food and ordering" selected={learnerInterest === 'food'} onPress={() => setLearnerInterest('food')} />
            <Choice title="👋 Everyday conversations" selected={learnerInterest === 'everyday'} onPress={() => setLearnerInterest('everyday')} />
            <Choice title="🚌 Getting around town" selected={learnerInterest === 'transport'} onPress={() => setLearnerInterest('transport')} />
            <Choice title="🔥 Slang and local expressions" selected={learnerInterest === 'slang'} onPress={() => setLearnerInterest('slang')} />

            <Pressable onPress={saveLearnerProfile} style={{ backgroundColor: '#16A34A', paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginTop: 26 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Build my learning path →</Text>
            </Pressable>
            <Text style={{ color: '#64748B', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 12 }}>You can change your learning preferences later. Your choices are saved on this device.</Text>
          </View>
        </ScrollView>
      );
    }

    const learningLevels = [
      {
        id: 'basics',
        number: '01',
        emoji: '🌱',
        title: 'Basics',
        subtitle: 'Your first steps in Mexican Spanish',
        lessons: 5,
        color: '#DCFCE7',
        accent: '#166534',
      },
      {
        id: 'slang',
        number: '02',
        emoji: '🔥',
        title: 'Mexican Slang',
        subtitle: 'Speak like locals do',
        lessons: 6,
        color: '#FFEDD5',
        accent: '#C2410C',
      },
      {
        id: 'street',
        number: '03',
        emoji: '🗣️',
        title: 'Street Spanish',
        subtitle: 'Real expressions for everyday life',
        lessons: 6,
        color: '#DBEAFE',
        accent: '#1D4ED8',
      },
    ];

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <View style={{
          backgroundColor: '#14532D',
          paddingTop: 56,
          paddingBottom: 30,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}>
          <Text style={{ fontSize: 38 }}>🇲🇽</Text>

          <Text style={{
            color: '#FFFFFF',
            fontSize: 30,
            fontWeight: 'bold',
            marginTop: 10,
          }}>
            MexicanSlang
          </Text>

          <Text style={{
            color: '#D1FAE5',
            fontSize: 15,
            marginTop: 6,
            lineHeight: 22,
          }}>
            {learnerGoal === 'travel' ? 'Get ready to explore Mexico with confidence.' : learnerGoal === 'living' ? 'Build confidence for everyday life in Mexico.' : learnerGoal === 'friends' ? 'Make connections and sound more natural with locals.' : 'Get comfortable with the language of nights out and social plans.'}
          </Text>

          <View style={{
            flexDirection: 'row',
            marginTop: 22,
            gap: 10,
          }}>
            <View style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              padding: 14,
              borderRadius: 16,
            }}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
              <Text style={{
                color: '#14532D',
                fontWeight: 'bold',
                fontSize: 20,
                marginTop: 5,
              }}>
                {xp}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12 }}>Total XP</Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              padding: 14,
              borderRadius: 16,
            }}>
              <Text style={{ fontSize: 22 }}>🔥</Text>
              <Text style={{
                color: '#C2410C',
                fontWeight: 'bold',
                fontSize: 20,
                marginTop: 5,
              }}>
                {currentStreak}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12 }}>Day streak</Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              padding: 14,
              borderRadius: 16,
            }}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text style={{
                color: '#14532D',
                fontWeight: 'bold',
                fontSize: 20,
                marginTop: 5,
              }}>
                {level}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12 }}>Your level</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
          <Text style={{
            fontSize: 23,
            fontWeight: 'bold',
            color: '#14532D',
          }}>
            Your learning path
          </Text>

          <Text style={{
            color: '#64748B',
            marginTop: 6,
            marginBottom: 12,
            fontSize: 14,
          }}>
            Complete each level to unlock the next one.
          </Text>
          <View style={{ backgroundColor: '#ECFDF5', borderRadius: 14, borderWidth: 1, borderColor: '#BBF7D0', padding: 14, marginBottom: 18 }}>
            <Text style={{ color: '#166534', fontSize: 12, fontWeight: '800', letterSpacing: 0.6 }}>YOUR PERSONAL FOCUS</Text>
            <Text style={{ color: '#14532D', fontSize: 15, fontWeight: '700', marginTop: 5 }}>
              {learnerInterest === 'food' ? '🌮 Food and ordering' : learnerInterest === 'everyday' ? '👋 Everyday conversations' : learnerInterest === 'transport' ? '🚌 Getting around town' : '🔥 Slang and local expressions'}
            </Text>
            <Text style={{ color: '#475569', fontSize: 12, marginTop: 4, lineHeight: 18 }}>
              {learnerLevel === 'beginner' ? 'Recommended starting point: Basics.' : learnerLevel === 'some' ? 'You know some Spanish — mix fundamentals with slang practice.' : 'You have a conversational base — focus on nuance and natural expressions.'}
            </Text>
            <Pressable onPress={async () => { await AsyncStorage.removeItem('mexicanSlangLearnerProfile'); setOnboardingComplete(false); }} style={{ alignSelf: 'flex-start', marginTop: 9, paddingVertical: 5 }}>
              <Text style={{ color: '#166534', fontSize: 12, fontWeight: '700' }}>Edit preferences</Text>
            </Pressable>
          </View>

          <View style={{
            height: 8,
            backgroundColor: '#E2E8F0',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 20,
          }}>
            <View style={{
              height: 8,
              width: `${(completedCategories.length / 3) * 100}%`,
              backgroundColor: '#16A34A',
              borderRadius: 8,
            }} />
          </View>
          <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 16 }}>
            {completedCategories.length} of 3 levels completed
          </Text>

          {learningLevels.map((item, index) => {
            const isCompleted = completedCategories.includes(item.id);
            const isLocked =
              (item.id === 'slang' && !completedCategories.includes('basics')) ||
              (item.id === 'street' &&
                (!completedCategories.includes('basics') ||
                 !completedCategories.includes('slang')));
            const isAvailable = !isLocked;
            const progress = isCompleted ? 100 : 0;

            return (
            <View key={item.id} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              padding: 18,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 18,
                  backgroundColor: item.color,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{
                    fontSize: 11,
                    color: item.accent,
                    fontWeight: 'bold',
                    letterSpacing: 1,
                  }}>
                    LEVEL {item.number}
                  </Text>

                  <Text style={{
                    fontSize: 19,
                    color: '#14532D',
                    fontWeight: 'bold',
                    marginTop: 3,
                  }}>
                    {item.title}
                  </Text>

                  <Text style={{
                    fontSize: 12,
                    color: '#64748B',
                    marginTop: 4,
                  }}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 18,
                marginBottom: 12,
              }}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>
                  📚 {item.lessons} questions
                </Text>

                <Text style={{
                  color: isLocked ? '#94A3B8' : item.accent,
                  fontWeight: 'bold',
                  fontSize: 12,
                }}>
                  {isCompleted ? '✓ COMPLETED' : isLocked ? '🔒 LOCKED' : index === 0 ? 'START HERE' : 'UNLOCKED'}
                </Text>
              </View>

              <View style={{
                height: 7,
                backgroundColor: '#E2E8F0',
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 14,
              }}>
                <View style={{
                  height: 7,
                  width: `${progress}%`,
                  backgroundColor: '#16A34A',
                  borderRadius: 8,
                }} />
              </View>

              <Pressable
                disabled={isLocked}
                onPress={() => router.push({
                  pathname: '/',
                  params: { category: item.id },
                })}
                style={{
                  backgroundColor: isLocked ? '#CBD5E1' : item.accent,
                  paddingVertical: 14,
                  borderRadius: 13,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 'bold',
                }}>
                  {isCompleted ? 'Practice again ↻' : isLocked ? 'Complete previous level 🔒' : index === 0 ? 'Start learning →' : 'Explore level →'}
                </Text>
              </Pressable>
            </View>
            );
          })}

          <Pressable
            onPress={() => {
              setConversationScenario(0);
              setConversationStep(0);
              setConversationAnswer('');
              setConversationCorrect(0);
              router.push({ pathname: '/', params: { category: 'conversation' } });
            }}
            style={{
              backgroundColor: '#0F766E',
              borderRadius: 20,
              padding: 20,
              marginBottom: 18,
            }}
          >
            <Text style={{ color: '#CCFBF1', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
              NEW · PRACTICE REAL LIFE
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 6 }}>
              🗣️ Conversation mode
            </Text>
            <Text style={{ color: '#F0FDFA', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              Order tacos, talk to friends, and practice what to say in everyday situations.
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14 }}>
              <Text style={{ color: '#115E59', fontWeight: 'bold' }}>Start a conversation →</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setFreeScenarioIndex(0);
              setFreeTurnIndex(0);
              setFreeResponse('');
              setFreeSubmitted(false);
              setFreeShowHint(false);
              setFreeSessionXp(0);
              router.push({ pathname: '/', params: { category: 'freeconversation' } });
            }}
            style={{ backgroundColor: '#1D4ED8', borderRadius: 20, padding: 20, marginBottom: 18 }}
          >
            <Text style={{ color: '#DBEAFE', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>NEW · WRITE YOUR OWN REPLY</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 6 }}>💬 Free conversation</Text>
            <Text style={{ color: '#EFF6FF', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              {learnerInterest === 'food'
                ? 'Recommended for you: start by ordering tacos, then practice everyday conversations and getting around town.'
                : learnerInterest === 'transport'
                  ? 'Recommended for you: start by asking for directions, then practice everyday conversations and ordering food.'
                  : learnerInterest === 'slang'
                    ? 'Recommended for you: start with casual expressions and friendly conversations, then practice everyday situations.'
                    : learnerGoal === 'friends' || learnerGoal === 'nightlife'
                      ? 'Recommended for you: start with friendly conversations and making plans, then practice real-life situations.'
                      : 'Go beyond multiple choice. Write what you would actually say in everyday Mexican situations.'}
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14 }}>
              <Text style={{ color: '#1D4ED8', fontWeight: 'bold' }}>Start free practice →</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setReviewIndex(0);
              setReviewSelectedAnswer('');
              router.push({ pathname: '/', params: { category: 'review' } });
            }}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 18,
              padding: 18,
              marginBottom: 18,
              borderWidth: 1,
              borderColor: '#A7F3D0',
            }}
          >
            <Text style={{ color: '#166534', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
              PERSONALIZED PRACTICE
            </Text>
            <Text style={{ color: '#14532D', fontSize: 21, fontWeight: 'bold', marginTop: 6 }}>
              🧠 Repasar expresiones
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              {reviewItems.length === 0
                ? 'Las respuestas incorrectas aparecerán aquí para practicar después.'
                : `Tienes ${reviewItems.length} ${reviewItems.length === 1 ? 'expresión pendiente' : 'expresiones pendientes'} para repasar.`}
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#DCFCE7', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14 }}>
              <Text style={{ color: '#166534', fontWeight: 'bold' }}>
                {reviewItems.length > 0 ? 'Comenzar repaso →' : 'Ver repaso →'}
              </Text>
            </View>
          </Pressable>

          <View style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 18,
            padding: 18,
            marginTop: 4,
          }}>
            <Text style={{
              fontSize: 17,
              fontWeight: 'bold',
              color: '#92400E',
            }}>
              🎯 Your daily mission
            </Text>

            <Text style={{
              color: '#92400E',
              marginTop: 6,
              lineHeight: 21,
            }}>
              Practice one lesson today, earn XP, and keep your streak alive!
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }


  if (category === 'conversation') {
    const scenario = conversationSteps[conversationScenario];
    const step = scenario.dialogue[conversationStep];
    const isLastStep = conversationStep === scenario.dialogue.length - 1;
    const isLastScenario = conversationScenario === conversationSteps.length - 1;

    function speakSpanish(text: string) {
      Speech.stop();
      Speech.speak(text, {
        language: 'es-MX',
        rate: 0.85,
        pitch: 1.0,
      });
    }

    function chooseConversationAnswer(option: string) {
      if (conversationAnswer !== '') return;
      setConversationAnswer(option);
      if (option === step.correct) {
        setConversationCorrect((previous) => previous + 1);
        setXp((previous) => previous + 10);
      }
    }

    function advanceConversation() {
      if (conversationAnswer === '') return;
      if (!isLastStep) {
        setConversationStep((previous) => previous + 1);
        setConversationAnswer('');
        return;
      }
      if (!isLastScenario) {
        setConversationScenario((previous) => previous + 1);
        setConversationStep(0);
        setConversationAnswer('');
        return;
      }
      router.replace('/');
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.replace('/')} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 16 }}>
          <Text style={{ color: '#334155', fontWeight: 'bold' }}>← Back to learning path</Text>
        </Pressable>

        <View style={{ backgroundColor: '#115E59', borderRadius: 24, padding: 22, marginBottom: 18 }}>
          <Text style={{ color: '#99F6E4', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>CONVERSATION MODE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginTop: 8 }}>{scenario.location}</Text>
          <Text style={{ color: '#CCFBF1', fontSize: 15, marginTop: 5 }}>{scenario.scene}</Text>
          <View style={{ height: 7, backgroundColor: '#0F766E', borderRadius: 8, overflow: 'hidden', marginTop: 18 }}>
            <View style={{ height: 7, width: `${((conversationSteps.slice(0, conversationScenario).reduce((sum, item) => sum + item.dialogue.length, 0) + conversationStep + 1) / conversationSteps.reduce((sum, item) => sum + item.dialogue.length, 0)) * 100}%`, backgroundColor: '#FDE68A', borderRadius: 8 }} />
          </View>
          <Text style={{ color: '#CCFBF1', fontSize: 12, marginTop: 8 }}>Situation {conversationScenario + 1} of {conversationSteps.length} · Turn {conversationStep + 1} of {scenario.dialogue.length}</Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 }}>
          <Text style={{ color: '#0F766E', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>{step.speaker.toUpperCase()} SAYS</Text>
          <Text style={{ color: '#0F172A', fontSize: 24, fontWeight: 'bold', lineHeight: 32, marginTop: 8 }}>{step.line}</Text>
          <Text style={{ color: '#64748B', fontSize: 15, marginTop: 8 }}>“{step.translation}”</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escuchar pronunciación en español mexicano"
            onPress={() => speakSpanish(step.line)}
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#CCFBF1', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 14 }}
          >
            <Text style={{ color: '#115E59', fontWeight: 'bold', fontSize: 14 }}>🔊 Escuchar pronunciación</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 18 }} />
          <Text style={{ color: '#334155', fontSize: 17, fontWeight: 'bold', lineHeight: 24 }}>{step.prompt}</Text>
        </View>

        {step.options.map((option) => {
          const chosen = conversationAnswer === option;
          const correct = option === step.correct;
          return (
            <Pressable
              key={option}
              onPress={() => chooseConversationAnswer(option)}
              disabled={conversationAnswer !== ''}
              style={{ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: conversationAnswer !== '' && correct ? '#16A34A' : chosen ? '#DC2626' : '#CBD5E1', backgroundColor: conversationAnswer !== '' && correct ? '#DCFCE7' : chosen ? '#FEE2E2' : '#FFFFFF', marginBottom: 10 }}
            >
              <Text style={{ color: '#0F172A', fontSize: 15, lineHeight: 22, fontWeight: '600' }}>{option}</Text>
            </Pressable>
          );
        })}

        {conversationAnswer !== '' && (
          <View style={{ backgroundColor: conversationAnswer === step.correct ? '#F0FDF4' : '#FFF7ED', borderColor: conversationAnswer === step.correct ? '#86EFAC' : '#FDBA74', borderWidth: 1, borderRadius: 18, padding: 18, marginTop: 4 }}>
            <Text style={{ color: conversationAnswer === step.correct ? '#166534' : '#9A3412', fontSize: 17, fontWeight: 'bold' }}>
              {conversationAnswer === step.correct ? '¡Muy bien! +10 XP 🎉' : '¡Casi! Aprende esta frase 💡'}
            </Text>
            <Text style={{ color: '#334155', fontSize: 15, lineHeight: 22, marginTop: 10 }}>{step.explanation}</Text>
            <Text style={{ color: '#0F766E', fontSize: 13, fontWeight: 'bold', marginTop: 12 }}>LOCAL TIP</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 4 }}>{step.tip}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Escuchar la respuesta correcta"
              onPress={() => speakSpanish(step.correct)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDFA', borderColor: '#99F6E4', borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 14 }}
            >
              <Text style={{ color: '#115E59', fontWeight: 'bold' }}>🔊 Escuchar respuesta correcta</Text>
            </Pressable>
            <Pressable onPress={advanceConversation} style={{ backgroundColor: '#0F766E', borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 18 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>{isLastStep && isLastScenario ? 'Finish conversation →' : 'Continue conversation →'}</Text>
            </Pressable>
          </View>
        )}

        <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 20 }}>⚡ {xp} total XP · {conversationCorrect} correct answers in this session</Text>
      </ScrollView>
    );
  }


  if (category === 'freeconversation') {
    const personalizedScenarios = [...freePracticeScenarios].sort((a, b) =>
      getScenarioPriority(a.id, learnerGoal, learnerInterest) -
      getScenarioPriority(b.id, learnerGoal, learnerInterest)
    );
    const scenario = personalizedScenarios[freeScenarioIndex];
    const turn = scenario.turns[freeTurnIndex];
    const isLastTurn = freeTurnIndex === scenario.turns.length - 1;
    const isLastScenario = freeScenarioIndex === personalizedScenarios.length - 1;
    const evaluation = evaluatePracticeReply(scenario.id, freeTurnIndex, turn, freeResponse);
    const matched = evaluation.accepted;

    function speakFreeSpanish(text: string) {
      Speech.stop();
      Speech.speak(text, { language: 'es-MX', rate: 0.85, pitch: 1.0 });
    }

    function submitFreeResponse() {
      if (!freeResponse.trim() || freeSubmitted) return;
      setFreeSubmitted(true);
      // This first version gives lightweight, local feedback; it does not send text to an AI service.
      if (matched) {
        setXp((previous) => previous + 5);
        setFreeSessionXp((previous) => previous + 5);
      }
    }

    function resetFreeTurn() {
      setFreeResponse('');
      setFreeSubmitted(false);
      setFreeShowHint(false);
    }

    function nextFreeTurn() {
      if (!freeSubmitted) return;
      if (!isLastTurn) {
        setFreeTurnIndex((previous) => previous + 1);
        resetFreeTurn();
        return;
      }
      if (!isLastScenario) {
        setFreeScenarioIndex((previous) => previous + 1);
        setFreeTurnIndex(0);
        resetFreeTurn();
        return;
      }
      router.replace('/');
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.replace('/')} style={{ alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 16 }}>
          <Text style={{ color: '#334155', fontWeight: 'bold' }}>← Back to learning path</Text>
        </Pressable>

        <View style={{ backgroundColor: '#1D4ED8', borderRadius: 24, padding: 22, marginBottom: 18 }}>
          <Text style={{ color: '#DBEAFE', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>FREE CONVERSATION · SPANISH PRACTICE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 27, fontWeight: 'bold', marginTop: 8 }}>{scenario.emoji} {scenario.title}</Text>
          <Text style={{ color: '#EFF6FF', fontSize: 14, lineHeight: 21, marginTop: 7 }}>{scenario.description}</Text>
          <Text style={{ color: '#DBEAFE', fontSize: 12, lineHeight: 18, marginTop: 8 }}>
            {learnerLevel === 'beginner'
              ? 'Beginner tip: short, simple replies are enough. Use the hint whenever you need it.'
              : learnerLevel === 'some'
                ? 'Practice tip: try a full sentence before checking the example.'
                : 'Challenge: try to answer naturally without using the hint first.'}
          </Text>
          <View style={{ height: 7, backgroundColor: '#1E40AF', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
            <View style={{ height: 7, width: `${((personalizedScenarios.slice(0, freeScenarioIndex).reduce((sum, item) => sum + item.turns.length, 0) + freeTurnIndex + 1) / personalizedScenarios.reduce((sum, item) => sum + item.turns.length, 0)) * 100}%`, backgroundColor: '#FDE68A', borderRadius: 8 }} />
          </View>
          <Text style={{ color: '#DBEAFE', fontSize: 12, marginTop: 8 }}>Situation {freeScenarioIndex + 1} of {personalizedScenarios.length} · Turn {freeTurnIndex + 1} of {scenario.turns.length}</Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#DBEAFE' }}>
          <Text style={{ color: '#1E3A8A', fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Choose a real-life situation</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {personalizedScenarios.map((item, index) => (
              <Pressable key={item.id} onPress={() => { setFreeScenarioIndex(index); setFreeTurnIndex(0); resetFreeTurn(); }} style={{ backgroundColor: index === freeScenarioIndex ? '#1D4ED8' : '#EFF6FF', borderColor: index === freeScenarioIndex ? '#1D4ED8' : '#BFDBFE', borderWidth: 1, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 12 }}>
                <Text style={{ color: index === freeScenarioIndex ? '#FFFFFF' : '#1E40AF', fontWeight: '600', fontSize: 13 }}>{item.emoji} {item.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 16 }}>
          <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>{turn.speaker.toUpperCase()} SAYS</Text>
          <Text style={{ color: '#0F172A', fontSize: 25, fontWeight: 'bold', lineHeight: 33, marginTop: 8 }}>{turn.spanishLine}</Text>
          <Text style={{ color: '#64748B', fontSize: 15, marginTop: 7 }}>“{turn.englishMeaning}”</Text>
          <Pressable onPress={() => speakFreeSpanish(turn.spanishLine)} style={{ alignSelf: 'flex-start', backgroundColor: '#DBEAFE', borderRadius: 11, paddingVertical: 10, paddingHorizontal: 13, marginTop: 13 }}>
            <Text style={{ color: '#1D4ED8', fontWeight: 'bold' }}>🔊 Listen to Mexican Spanish</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 17 }} />
          <Text style={{ color: '#0F172A', fontSize: 17, fontWeight: 'bold', lineHeight: 24 }}>{turn.prompt}</Text>
          <Text style={{ color: '#64748B', fontSize: 13, marginTop: 8 }}>Write your own reply in Spanish. Don’t worry about being perfect.</Text>
          <TextInput
            value={freeResponse}
            onChangeText={setFreeResponse}
            editable={!freeSubmitted}
            multiline
            placeholder="Type your reply in Spanish…"
            placeholderTextColor="#94A3B8"
            textAlignVertical="top"
            accessibilityLabel="Write your reply in Spanish"
            style={{ minHeight: 105, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 13, padding: 14, marginTop: 12, color: '#0F172A', backgroundColor: freeSubmitted ? '#F8FAFC' : '#FFFFFF', fontSize: 16, lineHeight: 23 }}
          />
          {!freeSubmitted && (
            <>
              <Pressable onPress={() => setFreeShowHint((previous) => !previous)} style={{ alignSelf: 'flex-start', paddingVertical: 10 }}>
                <Text style={{ color: '#1D4ED8', fontWeight: 'bold' }}>{freeShowHint ? 'Hide hint ↑' : '💡 Need a hint?'}</Text>
              </Pressable>
              {freeShowHint && <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 13, marginBottom: 12 }}><Text style={{ color: '#1E40AF', lineHeight: 21 }}>{turn.tip}</Text></View>}
              <Pressable disabled={!freeResponse.trim()} onPress={submitFreeResponse} style={{ backgroundColor: freeResponse.trim() ? '#1D4ED8' : '#94A3B8', borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>Check my reply →</Text>
              </Pressable>
            </>
          )}
        </View>

        {freeSubmitted && (
          <View style={{ backgroundColor: matched ? '#F0FDF4' : '#FFF7ED', borderColor: matched ? '#86EFAC' : '#FDBA74', borderWidth: 1, borderRadius: 18, padding: 18 }}>
            <Text style={{ color: matched ? '#166534' : '#9A3412', fontSize: 18, fontWeight: 'bold' }}>{matched ? 'Nice! Your reply communicates the main idea. +5 XP 🎉' : 'Good effort — let’s compare the meaning and a natural example.'}</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 9 }}>{evaluation.feedback}</Text>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 7 }}>{turn.tip}</Text>
            <Text style={{ color: '#166534', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.7, marginTop: 15 }}>A NATURAL WAY TO SAY IT</Text>
            <Text style={{ color: '#14532D', fontSize: 19, fontWeight: 'bold', lineHeight: 27, marginTop: 5 }}>{turn.sample}</Text>
            <Pressable onPress={() => speakFreeSpanish(turn.sample)} style={{ alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 11, paddingVertical: 10, paddingHorizontal: 13, marginTop: 12 }}>
              <Text style={{ color: '#166534', fontWeight: 'bold' }}>🔊 Listen to the example</Text>
            </Pressable>
            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 12 }}>Feedback checks natural phrase variants and requires more than one keyword for fallback matches. It is still a local rule-based evaluator, not a full AI language assessment, so unusual correct replies may need comparison with the example.</Text>
            <Pressable onPress={nextFreeTurn} style={{ backgroundColor: '#1D4ED8', borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 18 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>{isLastTurn && isLastScenario ? 'Finish practice →' : 'Next turn →'}</Text>
            </Pressable>
          </View>
        )}

        <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 18 }}>⚡ {xp} total XP · +{freeSessionXp} XP in this practice</Text>
      </ScrollView>
    );
  }

  if (category === 'review') {
    const currentReview = reviewItems[Math.min(reviewIndex, Math.max(reviewItems.length - 1, 0))];
    const reviewIsCorrect = currentReview && reviewSelectedAnswer === currentReview.correct;

    async function answerReview(option: string) {
      if (!currentReview || reviewSelectedAnswer !== '') return;
      setReviewSelectedAnswer(option);

      if (option === currentReview.correct) {
        setXp((previous) => previous + 5);
      } else {
        const updated = reviewItems.map((item) =>
          item.id === currentReview.id
            ? { ...item, attempts: item.attempts + 1 }
            : item
        );
        await persistReviewItems(updated);
      }
    }

    async function continueReview() {
      if (reviewIsCorrect && currentReview) {
        const updated = reviewItems.filter((item) => item.id !== currentReview.id);
        await persistReviewItems(updated);
        if (updated.length === 0) {
          setReviewIndex(0);
          setReviewSelectedAnswer('');
          return;
        }
        // The next item shifts into the same index after removing this one.
      } else if (reviewIndex >= reviewItems.length - 1) {
        setReviewIndex(0);
        setReviewSelectedAnswer('');
        router.replace('/');
        return;
      } else {
        setReviewIndex((previous) => previous + 1);
      }
      setReviewSelectedAnswer('');
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Pressable onPress={() => router.replace('/')} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 18 }}>
          <Text style={{ color: '#334155', fontWeight: 'bold' }}>← Volver al inicio</Text>
        </Pressable>

        <View style={{ backgroundColor: '#14532D', borderRadius: 22, padding: 22, marginBottom: 18 }}>
          <Text style={{ color: '#BBF7D0', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>REPASO INTELIGENTE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 27, fontWeight: 'bold', marginTop: 8 }}>🧠 Aprende de tus errores</Text>
          <Text style={{ color: '#DCFCE7', fontSize: 14, lineHeight: 21, marginTop: 8 }}>
            Responde de nuevo las expresiones que te costaron trabajo. Cuando aciertes, saldrán de tu lista.
          </Text>
        </View>

        {reviewItems.length === 0 || !currentReview ? (
          <View style={{ backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#D1FAE5' }}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={{ color: '#14532D', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 12 }}>¡Todo repasado!</Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 8 }}>
              No tienes expresiones pendientes. Sigue practicando y las que falles aparecerán aquí.
            </Text>
            <Pressable onPress={() => router.replace('/')} style={{ backgroundColor: '#14532D', borderRadius: 12, padding: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 20 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Volver a aprender →</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={{ color: '#64748B', fontWeight: '600', marginBottom: 10 }}>
              Expresión {reviewIndex + 1} de {reviewItems.length} · Intentos fallidos: {currentReview.attempts}
            </Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ color: '#166534', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>MEXICAN SPANISH</Text>
              <Text style={{ color: '#14532D', fontSize: 27, fontWeight: 'bold', marginTop: 8 }}>{currentReview.phrase}</Text>
              <Text style={{ color: '#1F2937', fontSize: 17, lineHeight: 24, marginTop: 12, marginBottom: 18 }}>{currentReview.question}</Text>

              {currentReview.options.map((option) => {
                const chosen = reviewSelectedAnswer === option;
                const correct = option === currentReview.correct;
                return (
                  <Pressable
                    key={option}
                    disabled={reviewSelectedAnswer !== ''}
                    onPress={() => answerReview(option)}
                    style={{
                      backgroundColor: reviewSelectedAnswer !== '' && correct ? '#DCFCE7' : chosen ? '#FEE2E2' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: reviewSelectedAnswer !== '' && correct ? '#16A34A' : chosen ? '#DC2626' : '#CBD5E1',
                      borderRadius: 12,
                      padding: 15,
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: '#1F2937', fontSize: 15 }}>{option}</Text>
                  </Pressable>
                );
              })}

              {reviewSelectedAnswer !== '' && (
                <View style={{ backgroundColor: reviewIsCorrect ? '#F0FDF4' : '#FFF7ED', padding: 15, borderRadius: 12, marginTop: 6 }}>
                  <Text style={{ color: reviewIsCorrect ? '#166534' : '#9A3412', fontWeight: 'bold', fontSize: 17 }}>
                    {reviewIsCorrect ? '¡Correcto! +5 XP 🎉' : 'Todavía falta practicar 💪'}
                  </Text>
                  <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 8 }}>
                    Respuesta correcta: {currentReview.correct}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
                    {currentReview.example}
                  </Text>
                  <Pressable onPress={continueReview} style={{ backgroundColor: '#14532D', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                      {reviewIndex >= reviewItems.length - 1 ? 'Terminar repaso →' : 'Siguiente expresión →'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.flag}>🇲🇽</Text>
        <Text style={styles.title}>MexicanSlang</Text>
        <Text style={styles.subtitle}>
          Speak Mexican, not just Spanish.
        </Text>
        <View
          style={{
            backgroundColor: '#FFF7ED',
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 16,
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 22 }}>
            🔥 {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#9A3412',
              marginTop: 3,
            }}
          >
            Daily streak
            <Text
              style={{
                fontSize: 12,
                color: '#9A3412',
                marginTop: 5,
                textAlign: 'center',
              }}
            >
              {currentStreak >= 30
                ? '🏆 ¡Leyenda del slang mexicano!'
                : currentStreak >= 7
                  ? '🌟 ¡Una semana hablando mexicano!'
                  : currentStreak >= 3
                    ? '🔥 ¡Ya estás creando un hábito!'
                    : currentStreak === 1
                      ? '💪 ¡Buen comienzo! Vuelve mañana .'
                      : '¡Practica hoy para comenzar tu racha!'}
            </Text>
          </Text>
        </View>
      </View>

      
<View style={{
  marginHorizontal: 20,
  marginBottom: 24,
  padding: 18,
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#E5E7EB',
}}>
  <Text style={{
    fontSize: 20,
    fontWeight: 'bold',
    color: '#14532D',
  }}>
    📅 Practice calendar
  </Text>

  <Text style={{
    color: '#64748B',
    marginTop: 5,
    marginBottom: 16,
  }}>
    Cada día cuenta. ¡Sigue aprendiendo!
  </Text>

  <View style={{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  }}>
    <Pressable onPress={() => setCalendarMonth(
      new Date(calendarYear, calendarMonthIndex - 1, 1)
    )}>
      <Text style={{ fontSize: 24, paddingHorizontal: 10 }}>‹</Text>
    </Pressable>

    <Text style={{
      fontSize: 17,
      fontWeight: 'bold',
      textTransform: 'capitalize',
      color: '#14532D',
    }}>
      {monthName}
    </Text>

    <Pressable
      disabled={
        calendarYear === new Date().getFullYear() &&
        calendarMonthIndex === new Date().getMonth()
      }
      onPress={() => setCalendarMonth(
        new Date(calendarYear, calendarMonthIndex + 1, 1)
      )}
    >
      <Text style={{
        fontSize: 24,
        paddingHorizontal: 10,
        color:
          calendarYear === new Date().getFullYear() &&
          calendarMonthIndex === new Date().getMonth()
            ? '#CBD5E1'
            : '#14532D',
      }}>
        ›
      </Text>
    </Pressable>
  </View>

  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, index) => (
      <View key={index} style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ color: '#64748B', fontWeight: 'bold' }}>
          {day}
        </Text>
      </View>
    ))}
  </View>

  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
    {calendarCells.map((day, index) => {
      if (day === 0) {
        return <View key={`empty-${index}`} style={{ width: '14.2857%', height: 43 }} />;
      }

      const practiced = practiceDays.includes(calendarDateKey(day));
      const isToday =
        calendarDateKey(day) ===
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

      return (
        <View key={day} style={{
          width: '14.2857%',
          height: 43,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: practiced ? '#16A34A' : 'transparent',
            borderWidth: isToday && !practiced ? 2 : 0,
            borderColor: '#16A34A',
          }}>
            <Text style={{
              color: practiced ? '#FFFFFF' : '#334155',
              fontWeight: isToday || practiced ? 'bold' : 'normal',
            }}>
              {practiced ? '✓' : day}
            </Text>
          </View>
        </View>
      );
    })}
  </View>

  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  }}>
    <View style={{
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#16A34A',
    }} />
    <Text style={{ color: '#64748B', fontSize: 12 }}>
      Día de práctica completado
    </Text>
  </View>

  <Text style={{
    marginTop: 12,
    color: '#14532D',
    fontWeight: 'bold',
  }}>
    🔥 Racha actual: {currentStreak} {currentStreak === 1 ? 'día' : 'días'}
  </Text>

  <Text style={{ color: '#64748B', marginTop: 4, fontSize: 12 }}>
    Días practicados este mes: {
      practiceDays.filter((date) =>
        date.startsWith(
          `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-`
        )
      ).length
    }
  </Text>
</View>


      {!finished ? (
        <>
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>¡Qué onda! 👋</Text>
            <Text style={styles.bannerText}>
              Learn the real Spanish people speak in Mexico.
            </Text>
          </View>

          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {currentQuestion + 1} of {activeQuestions.length}
            </Text>
            <Text style={styles.score}>⭐ {score} pts</Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#166534' }}>
              🏆 Level {level}
            </Text>

            <Text style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              ⚡ {xp} XP · {xpInLevel}/100 XP to next level
            </Text>

            <View
              style={{
                height: 8,
                backgroundColor: '#E5E7EB',
                borderRadius: 10,
                overflow: 'hidden',
                marginTop: 8,
              }}>
              <View
                style={{
                  height: 8,
                  width: `${xpInLevel}%`,
                  backgroundColor: '#16A34A',
                  borderRadius: 10,
                }}
              />
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentQuestion + 1) / activeQuestions.length) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.quiz}>
            <Text style={styles.kicker}>MEXICAN SPANISH</Text>
            <Text style={styles.phrase}>{question.phrase}</Text>
            <Text style={styles.question}>{question.question}</Text>

            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === question.correct;

              return (
                <Pressable
                  key={option}
                  onPress={() => chooseAnswer(option)}
                  disabled={selectedAnswer !== ''}
                  style={[
                    styles.option,
                    selectedAnswer !== '' && isCorrect && styles.correctOption,
                    isSelected && !isCorrect && styles.wrongOption,
                  ]}
                >
                  <Text style={styles.optionText}>{option}</Text>
                  {selectedAnswer !== '' && isCorrect && (
                    <Text style={styles.optionMark}>✓</Text>
                  )}
                  {isSelected && !isCorrect && (
                    <Text style={styles.optionMark}>✕</Text>
                  )}
                </Pressable>
              );
            })}

            {selectedAnswer !== '' && (
              <View style={styles.feedback}>
                <Text style={styles.feedbackTitle}>
                  {selectedAnswer === question.correct
                    ? 'Correct! 🎉'
                    : 'Not quite! 💪'}
                </Text>
                <Text style={styles.feedbackText}>
                  {question.example}
                </Text>
                <View style={styles.teachingDivider} />
                <Text style={styles.teachingLabel}>💡 WHAT IT REALLY MEANS</Text>
                <Text style={styles.teachingText}>
                  {phraseGuides[question.phrase]?.meaning ?? 'A common expression in everyday Mexican Spanish.'}
                </Text>
                <Text style={styles.teachingLabel}>🗣️ WHEN TO USE IT</Text>
                <Text style={styles.teachingText}>
                  {phraseGuides[question.phrase]?.whenToUse ?? 'Use it according to the situation and how well you know the person.'}
                </Text>
                <View style={styles.nuanceCard}>
                  <Text style={styles.nuanceTitle}>🇲🇽 Local tip</Text>
                  <Text style={styles.teachingText}>
                    {phraseGuides[question.phrase]?.nuance ?? 'Pay attention to context and tone; slang can vary by region.'}
                  </Text>
                </View>
                <Text style={styles.translationText}>
                  Meaning of the example: {phraseGuides[question.phrase]?.exampleTranslation ?? question.example}
                </Text>
              </View>
            )}

            {selectedAnswer !== '' && (
              <Pressable style={styles.nextButton} onPress={nextQuestion}>
                <Text style={styles.nextButtonText}>
                  {currentQuestion === activeQuestions.length - 1
                    ? 'See my results'
                    : 'Next question →'}
                </Text>
              </Pressable>
            )}
          </View>
        </>
      ) : (
        <View style={styles.result}>
          <Text style={styles.resultEmoji}>
            {score >= 4 ? '🏆' : score >= 3 ? '🎉' : '📚'}
          </Text>
          <Text style={styles.resultTitle}>Lesson complete!</Text>
          <View
            style={{
              backgroundColor: '#FFF7ED',
              padding: 14,
              borderRadius: 14,
              marginTop: 16,
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Text style={{ fontSize: 32 }}>🔥</Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: 'bold',
                color: '#C2410C',
                marginTop: 4,
              }}
            >
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'} streak
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: '#9A3412',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {currentStreak >= 30
                ? '🏆 ¡Leyenda del slang mexicano!'
                : currentStreak >= 7
                  ? '🌟 ¡Una semana hablando mexicano!'
                  : currentStreak >= 3
                    ? '🔥 ¡Ya estás creando un hábito!'
                    : currentStreak === 1
                      ? '💪 ¡Buen comienzo! Vuelve mañana.'
                      : '¡Practica hoy para comenzar tu racha!'}
            </Text>
          </View>
          {firstLessonBadge && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
              }}
            >
              <ConfettiPiece emoji="🎉" delay={0} startX={20} />
              <ConfettiPiece emoji="✨" delay={150} startX={70} />
              <ConfettiPiece emoji="🎊" delay={300} startX={120} />
              <ConfettiPiece emoji="⭐" delay={450} startX={170} />
              <ConfettiPiece emoji="🎉" delay={600} startX={220} />
              <ConfettiPiece emoji="✨" delay={750} startX={270} />
              <Animated.View
                entering={ZoomIn.springify().damping(5).stiffness(150)}
                style={{
                  backgroundColor: '#FEF3C7',
                  padding: 12,
                  borderRadius: 12,
                  marginVertical: 12,
                  alignItems: 'center',
                }}
              >

                <Animated.Text
                  entering={FadeIn.duration(800)}
                  style={{ fontSize: 36 }}
                >
                  🏅
                </Animated.Text>

                <Text style={{ fontWeight: 'bold', color: '#92400E' }}>
                  {unlockedBadgeName}
                </Text>

                <Text style={{ color: '#92400E', fontSize: 12 }}>
                  You completed your first lesson!
                </Text>
              </Animated.View>
            </View>
          )}
          {perfectLessonBadge && (
            <View
              style={{
                backgroundColor: '#DBEAFE',
                padding: 12,
                borderRadius: 12,
                marginVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 28 }}>🏆</Text>
              <Text style={{ fontWeight: 'bold', color: '#1D4ED8' }}>
                Perfectionist!
              </Text>
              <Text style={{ color: '#1D4ED8', fontSize: 12 }}>
                You answered every question correctly!
              </Text>
            </View>
          )}

          <Text style={styles.resultScore}>
            {score} / {activeQuestions.length}
          </Text>
          <Text style={styles.resultSubtitle}>
            {score === 5
              ? '¡Excelente! You nailed every expression!'
              : score >= 3
                ? '¡Muy bien! You’re learning Mexican Spanish!'
                : '¡Ánimo! Keep practicing and you’ll improve.'}
          </Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardText}>
              ⚡ Total XP: {xp}
            </Text>
            <Text style={styles.resultCardText}>
              🏆 Level: {level}
            </Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardText}>
              Accuracy: {Math.round((score / activeQuestions.length) * 100)}%
            </Text>
          </View>


          <View style={styles.resultCard}>
            <Text style={styles.resultCardText}>
              📚 Lessons completed: {completedLessons}
            </Text>
          </View>



          <View style={styles.resultCard}>
            <Text style={styles.resultCardText}>
              🏆 Best score: {bestScore}/{activeQuestions.length}
            </Text>
          </View>


          <Pressable style={styles.nextButton} onPress={restartLesson}>
            <Text style={styles.nextButtonText}>Try again ↻</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.footer}>Made with ❤️ in Mexico by Alan</Text>
      <Modal
        visible={showBadgeAnimation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBadgeAnimation(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Animated.View
            entering={ZoomIn.springify().damping(5).stiffness(150)}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 28,
              alignItems: 'center',
              width: '100%',
              maxWidth: 320,
            }}
          >

            <Animated.Text
              entering={FadeIn.duration(800)}
              style={{ fontSize: 76 }}
            >
              🏆
            </Animated.Text>

            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#166534',
                textAlign: 'center',
                marginTop: 12,
              }}
            >
              Achievement Unlocked!
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: '#475569',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              {unlockedBadgeName}
            </Text>

            <Pressable
              onPress={() => setShowBadgeAnimation(false)}
              style={{
                backgroundColor: '#16A34A',
                paddingVertical: 12,
                paddingHorizontal: 28,
                borderRadius: 12,
                marginTop: 24,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                Awesome!
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F2',
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 22,
  },
  flag: {
    fontSize: 38,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#14532D',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
  },
  banner: {
    backgroundColor: '#14532D',
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 20,
    marginBottom: 24,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  bannerText: {
    color: '#E5F5E9',
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  progressHeader: {
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#555555',
    fontSize: 14,
    fontWeight: '600',
  },
  score: {
    color: '#14532D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E0E5DD',
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#22A05A',
    borderRadius: 8,
  },
  quiz: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8E8E0',
  },
  kicker: {
    color: '#777777',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  phrase: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14532D',
    marginTop: 8,
    marginBottom: 14,
  },
  question: {
    fontSize: 17,
    color: '#222222',
    marginBottom: 18,
    lineHeight: 24,
  },
  option: {
    backgroundColor: '#F7F7F2',
    borderWidth: 1,
    borderColor: '#E6E8E1',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  correctOption: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22A05A',
  },
  wrongOption: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  optionText: {
    flex: 1,
    color: '#222222',
    fontSize: 15,
  },
  optionMark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#14532D',
    marginLeft: 8,
  },
  feedback: {
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  feedbackTitle: {
    color: '#14532D',
    fontSize: 17,
    fontWeight: 'bold',
  },
  feedbackText: {
    color: '#444444',
    fontSize: 14,
    marginTop: 6,
    lineHeight: 21,
  },
  teachingDivider: {
    height: 1,
    backgroundColor: '#BBF7D0',
    marginVertical: 13,
  },
  teachingLabel: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 10,
  },
  teachingText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  nuanceCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  nuanceTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: 'bold',
  },
  translationText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: 'italic',
  },
  nextButton: {
    backgroundColor: '#14532D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  result: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E0',
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#14532D',
    textAlign: 'center',
  },
  resultScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#14532D',
    marginTop: 18,
  },
  resultSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#555555',
    marginTop: 12,
  },
  resultCard: {
    width: '100%',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginTop: 22,
    alignItems: 'center',
  },
  resultCardText: {
    fontSize: 17,
    color: '#14532D',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    color: '#888888',
    marginTop: 25,
  },
});
