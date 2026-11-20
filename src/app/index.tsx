
import BackButton from '@/components/back-button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Image,
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

type InteractivePracticeLevel = 'beginner' | 'intermediate' | 'advanced';

type InteractivePracticeItem =
  | { id: string; level?: InteractivePracticeLevel; type: 'choice'; prompt: string; options: string[]; answer: string; explanation: string }
  | { id: string; level?: InteractivePracticeLevel; type: 'blank'; prompt: string; answer: string; explanation: string }
  | { id: string; level?: InteractivePracticeLevel; type: 'order'; prompt: string; words: string[]; answer: string; explanation: string };

const interactivePracticeItems: InteractivePracticeItem[] = [
  { id: 'choice-1', type: 'choice', prompt: 'A friend says: “¿Qué onda?”. What is a natural reply?', options: ['¡Todo bien! ¿Y tú?', 'Soy onda.', 'Tengo una onda.'], answer: '¡Todo bien! ¿Y tú?', explanation: '“¿Qué onda?” is an informal way to say “What’s up?”. “¡Todo bien! ¿Y tú?” is a natural reply.' },
  { id: 'blank-1', type: 'blank', prompt: 'Complete the phrase: “Me _____ un café, por favor.”', answer: 'da', explanation: '“¿Me da…?” is a polite, common way to ask for something in a shop or café.' },
  { id: 'order-1', type: 'order', prompt: 'Put the words in the correct order to say “I’m in / Count me in!”', words: ['jalo', '¡Va,', '!'], answer: '¡Va, jalo!', explanation: '“¡Va, jalo!” is a casual Mexican expression meaning “Sounds good, I’m in!”.' },
  { id: 'choice-2', type: 'choice', prompt: 'At a taquería, how do you politely order three tacos?', options: ['Me da tres tacos, por favor.', 'Estoy tres tacos.', 'Tengo tres tacos hambre.'], answer: 'Me da tres tacos, por favor.', explanation: '“Me da…” is a natural way to order. Adding “por favor” makes it polite.' },
  { id: 'blank-2', type: 'blank', prompt: 'Complete the expression: “No hay _____, yo invito.” (No problem, it’s on me.)', answer: 'bronca', explanation: '“No hay bronca” means “No problem” in informal Mexican Spanish.' },
  { id: 'order-2', type: 'order', prompt: 'Build the sentence: “I went out with my friends.”', words: ['mis', 'Salí', 'amigos', 'con'], answer: 'Salí con mis amigos', explanation: 'The natural order is “Salí con mis amigos”.' },
  { id: 'choice-3', type: 'choice', prompt: 'Someone asks “¿Cuánto es en total?”. What are they asking?', options: ['How much is it altogether?', 'Where is the bathroom?', 'What time do you close?'], answer: 'How much is it altogether?', explanation: '“¿Cuánto es en total?” asks for the total price.' },
  { id: 'blank-3', type: 'blank', prompt: 'Complete the phrase: “Está _____, gracias.” (That’s fine, thanks.)', answer: 'bien', explanation: '“Está bien” means “It’s fine / That’s okay”.' },
  { id: 'order-3', type: 'order', prompt: 'Build a casual agreement: “Okay, see you tomorrow.”', words: ['mañana', 'Va,', 'nos', 'vemos'], answer: 'Va, nos vemos mañana', explanation: '“Va, nos vemos mañana” is a natural, casual way to agree and say goodbye.' },

  // More multiple-choice practice
  { id: 'choice-4', type: 'choice', prompt: 'Your friend says “¡Qué padre!”. What do they mean?', options: ['That’s cool!', 'That is my dad.', 'How embarrassing!'], answer: 'That’s cool!', explanation: 'In Mexico, “¡Qué padre!” means something is great, cool, or awesome.' },
  { id: 'choice-5', type: 'choice', prompt: 'You arrive at a friend’s place. What does “Pásale” mean?', options: ['Come in!', 'Go away!', 'Pay here!'], answer: 'Come in!', explanation: '“Pásale” is a friendly invitation to come inside or come through.' },
  { id: 'choice-6', type: 'choice', prompt: 'Someone says “Ahorita voy”. What is the closest meaning in casual conversation?', options: ['I’ll be there in a little bit.', 'I went yesterday.', 'I never go there.'], answer: 'I’ll be there in a little bit.', explanation: '“Ahorita” is flexible in Mexico and often means soon or in a little while; the exact timing depends on context.' },
  { id: 'choice-7', type: 'choice', prompt: 'At a shop, the cashier asks “¿Algo más?”. What are they asking?', options: ['Anything else?', 'Are you lost?', 'Do you work here?'], answer: 'Anything else?', explanation: '“¿Algo más?” is a common way to ask whether you want anything else.' },
  { id: 'choice-8', type: 'choice', prompt: 'Your friend says “No manches”. What are they usually expressing?', options: ['Surprise or disbelief', 'That they are washing clothes', 'That they are hungry'], answer: 'Surprise or disbelief', explanation: '“No manches” is an informal Mexican expression of surprise, disbelief, or annoyance. It is casual.' },
  { id: 'choice-9', type: 'choice', prompt: 'Which phrase means “I’m tired” in everyday Spanish?', options: ['Estoy cansado.', 'Tengo cansado.', 'Soy cansado.'], answer: 'Estoy cansado.', explanation: 'Use “estar” for a temporary state: “Estoy cansado” or “Estoy cansada”.' },
  { id: 'choice-10', type: 'choice', prompt: 'A person says “¿Me echas la mano?”. What are they asking?', options: ['Can you give me a hand?', 'Can you throw my hand?', 'Can you lend me money?'], answer: 'Can you give me a hand?', explanation: '“Echar la mano” means to help someone.' },
  { id: 'choice-11', type: 'choice', prompt: 'What does “Está bien padre” mean?', options: ['It’s really cool.', 'It belongs to my father.', 'It is very expensive.'], answer: 'It’s really cool.', explanation: '“Padre” is Mexican slang for something good, fun, or cool.' },
  { id: 'choice-12', type: 'choice', prompt: 'You want to say “I don’t understand”. Which is correct?', options: ['No entiendo.', 'No entendo.', 'No entiendo nada de tú.'], answer: 'No entiendo.', explanation: '“No entiendo” is the standard, natural way to say “I don’t understand”.' },
  { id: 'choice-13', type: 'choice', prompt: 'Your friend says “Qué pena”. What can it mean?', options: ['How embarrassing / What a shame.', 'What a delicious meal.', 'How expensive.'], answer: 'How embarrassing / What a shame.', explanation: '“Qué pena” can express embarrassment, awkwardness, or regret depending on context.' },
  { id: 'choice-14', type: 'choice', prompt: 'Which is a natural way to ask a friend what they are doing?', options: ['¿Qué haces?', '¿Qué eres haciendo?', '¿Qué haces tú ser?'], answer: '¿Qué haces?', explanation: '“¿Qué haces?” is a natural, everyday question: “What are you doing?”.' },
  { id: 'choice-15', type: 'choice', prompt: 'Someone says “Aguas”. What warning are they giving?', options: ['Watch out!', 'Drink some water!', 'It is raining!'], answer: 'Watch out!', explanation: '“¡Aguas!” is a common informal warning to be careful or look out.' },

  // More fill-in-the-blank practice
  { id: 'blank-4', type: 'blank', prompt: 'Complete the phrase: “¿Qué _____? ¿Todo bien?” (What’s up?)', answer: 'onda', explanation: '“¿Qué onda?” is a very common informal greeting in Mexico.' },
  { id: 'blank-5', type: 'blank', prompt: 'Complete the phrase: “¡Qué _____! No te veía hace mucho.” (What a surprise!)', answer: 'sorpresa', explanation: '“¡Qué sorpresa!” is a natural way to express pleasant surprise.' },
  { id: 'blank-6', type: 'blank', prompt: 'Complete the request: “¿Me puedes echar la _____?” (Can you give me a hand?)', answer: 'mano', explanation: 'The expression is “echar la mano”, meaning to help.' },
  { id: 'blank-7', type: 'blank', prompt: 'Complete the phrase: “Tengo _____.” (I am hungry.)', answer: 'hambre', explanation: 'In Spanish, you say “tener hambre” rather than “estar hambre”.' },
  { id: 'blank-8', type: 'blank', prompt: 'Complete the phrase: “Nos vemos al _____.” (See you later.)', answer: 'rato', explanation: '“Al rato” means later or in a little while, depending on context.' },
  { id: 'blank-9', type: 'blank', prompt: 'Complete the phrase: “¿A qué _____ nos vemos?” (What time shall we meet?)', answer: 'hora', explanation: '“¿A qué hora…?” is the standard way to ask at what time.' },
  { id: 'blank-10', type: 'blank', prompt: 'Complete the phrase: “Está _____, no te preocupes.” (It’s okay, don’t worry.)', answer: 'bien', explanation: '“Está bien” means “It’s okay” or “That’s fine”.' },
  { id: 'blank-11', type: 'blank', prompt: 'Complete the phrase: “¡Qué _____ hace!” (It’s so hot!)', answer: 'calor', explanation: 'The natural expression is “¡Qué calor hace!”.' },
  { id: 'blank-12', type: 'blank', prompt: 'Complete the phrase: “Me da _____ verte.” (I’m happy to see you.)', answer: 'gusto', explanation: '“Me da gusto verte” is a natural expression meaning “I’m happy to see you”.' },
  { id: 'blank-13', type: 'blank', prompt: 'Complete the phrase: “¿Me _____ la cuenta, por favor?” (Can I have the bill, please?)', answer: 'trae', explanation: '“¿Me trae la cuenta?” is a polite way to ask for the bill.' },
  { id: 'blank-14', type: 'blank', prompt: 'Complete the phrase: “No tengo _____ idea.” (I have no idea.)', answer: 'ni', explanation: 'The common expression is “No tengo ni idea”.' },
  { id: 'blank-15', type: 'blank', prompt: 'Complete the phrase: “¡Qué _____! Está lloviendo muchísimo.” (What a mess!)', answer: 'desastre', explanation: '“¡Qué desastre!” expresses that a situation is a mess.' },

  // More sentence-building practice
  { id: 'order-4', type: 'order', prompt: 'Build the sentence: “I’m going to the market.”', words: ['mercado', 'al', 'Voy'], answer: 'Voy al mercado', explanation: '“Voy al mercado” means “I’m going to the market”.' },
  { id: 'order-5', type: 'order', prompt: 'Build the sentence: “Can you help me?”', words: ['ayudarme', '¿Puedes', '?'], answer: '¿Puedes ayudarme?', explanation: 'The natural structure is “¿Puedes ayudarme?”.' },
  { id: 'order-6', type: 'order', prompt: 'Build the sentence: “I don’t have cash.”', words: ['efectivo', 'No', 'traigo'], answer: 'No traigo efectivo', explanation: 'In Mexico, “No traigo efectivo” is a natural way to say you do not have cash with you.' },
  { id: 'order-7', type: 'order', prompt: 'Build the sentence: “Where is the nearest bathroom?”', words: ['baño', 'más', '¿Dónde', 'cercano', 'está', '?', 'el'], answer: '¿Dónde está el baño más cercano?', explanation: '“¿Dónde está el baño más cercano?” is a polite, useful question when you are out.' },
  { id: 'order-8', type: 'order', prompt: 'Build the sentence: “I really like this song.”', words: ['mucho', 'gusta', 'canción', 'Me', 'esta'], answer: 'Me gusta mucho esta canción', explanation: 'Use “me gusta” for something you like; “mucho” adds emphasis.' },
  { id: 'order-9', type: 'order', prompt: 'Build the sentence: “Let’s go eat.”', words: ['comer', 'a', 'Vamos'], answer: 'Vamos a comer', explanation: '“Vamos a + infinitive” is a common way to suggest doing something together.' },
  { id: 'order-10', type: 'order', prompt: 'Build the sentence: “I’ll call you later.”', words: ['marco', 'Al', 'te', 'rato'], answer: 'Al rato te marco', explanation: '“Al rato te marco” is a natural, casual way to say you will call later.' },
  { id: 'order-11', type: 'order', prompt: 'Build the sentence: “I’m looking for a good restaurant.”', words: ['restaurante', 'buscando', 'un', 'Estoy', 'buen'], answer: 'Estoy buscando un buen restaurante', explanation: '“Buen” goes before a masculine singular noun: “un buen restaurante”.' },
  { id: 'order-12', type: 'order', prompt: 'Build the sentence: “Can you speak more slowly, please?”', words: ['más', '¿Puedes', 'despacio', 'hablar', 'por', 'favor', '?'], answer: '¿Puedes hablar más despacio por favor?', explanation: '“¿Puedes hablar más despacio, por favor?” is a useful, polite request.' },
  { id: 'order-13', type: 'order', prompt: 'Build the sentence: “I’m having a great time.”', words: ['bien', 'pasando', 'la', 'Estoy'], answer: 'La estoy pasando bien', explanation: '“La estoy pasando bien” is a natural Mexican Spanish expression for “I’m having a great time”.' },
  { id: 'order-14', type: 'order', prompt: 'Build the sentence: “I’ll see you at the party.”', words: ['fiesta', 'la', 'en', 'Veo', 'te'], answer: 'Te veo en la fiesta', explanation: '“Te veo en la fiesta” means “I’ll see you at the party”.' },
  { id: 'order-15', type: 'order', prompt: 'Build the sentence: “That sounds good to me.”', words: ['suena', 'bien', 'Me'], answer: 'Me suena bien', explanation: '“Me suena bien” is a natural way to say “That sounds good to me”.' },

  // Additional beginner exercises: useful everyday language in realistic contexts.
  { id: 'choice-16', level: 'beginner', type: 'choice', prompt: 'You enter a small shop. Which greeting sounds polite and natural?', options: ['Buenos días, ¿cómo está?', '¿Qué transa, patrón?', 'Dame cosas ahora.'], answer: 'Buenos días, ¿cómo está?', explanation: 'A polite greeting is a safe choice when speaking to a shopkeeper you do not know.' },
  { id: 'choice-17', level: 'beginner', type: 'choice', prompt: 'A waiter asks “¿Algo más?”. You have everything you need. What do you say?', options: ['Nada más, gracias.', 'No soy más.', 'Ya nunca más.'], answer: 'Nada más, gracias.', explanation: '“Nada más” means “nothing else”. It is a natural way to finish an order.' },
  { id: 'choice-18', level: 'beginner', type: 'choice', prompt: 'Your Mexican friend says “Ahorita regreso”. What should you understand?', options: ['They will be back soon, but the exact timing depends on context.', 'They came back yesterday.', 'They are never coming back.'], answer: 'They will be back soon, but the exact timing depends on context.', explanation: '“Ahorita” is flexible in Mexico. Context and the speaker matter; it does not always mean immediately.' },
  { id: 'blank-16', level: 'beginner', type: 'blank', prompt: 'Complete the polite request: “¿Me _____ traer la cuenta, por favor?”', answer: 'puede', explanation: '“¿Me puede traer…?” is a polite way to ask someone to bring you something.' },
  { id: 'blank-17', level: 'beginner', type: 'blank', prompt: 'You are leaving a shop. Complete: “Muchas gracias. ¡Hasta _____!”', answer: 'luego', explanation: '“Hasta luego” is a common, friendly way to say goodbye.' },
  { id: 'blank-18', level: 'beginner', type: 'blank', prompt: 'Complete the sentence: “No traigo efectivo. ¿Aceptan _____?”', answer: 'tarjeta', explanation: '“¿Aceptan tarjeta?” asks whether a business accepts card payments.' },
  { id: 'order-16', level: 'beginner', type: 'order', prompt: 'You want to ask a stranger politely where the restroom is.', words: ['está', '¿Dónde', 'el', 'baño', '?'], answer: '¿Dónde está el baño?', explanation: 'This is a direct, standard question. You can add “por favor” to make it warmer.' },
  { id: 'order-17', level: 'beginner', type: 'order', prompt: 'Tell a friend you will see them later.', words: ['vemos', 'al', 'rato', 'nos'], answer: 'Nos vemos al rato', explanation: '“Nos vemos al rato” is a natural casual goodbye meaning “See you later”.' },
  { id: 'order-18', level: 'beginner', type: 'order', prompt: 'Ask a vendor for one bottle of water, politely.', words: ['una', 'Me', 'botella', 'de', 'agua', 'da', 'por', 'favor'], answer: 'Me da una botella de agua por favor', explanation: '“¿Me da…?” is a common polite request when ordering or buying something.' },

  // Intermediate: interpret tone, choose idiomatic replies, and use common grammar naturally.
  { id: 'choice-19', level: 'intermediate', type: 'choice', prompt: 'A friend cancels plans at the last minute. Which reply sounds understanding but casual?', options: ['Ni modo, luego nos ponemos de acuerdo.', 'No modo, yo soy acuerdo.', 'Qué padre, me cancelaste.'], answer: 'Ni modo, luego nos ponemos de acuerdo.', explanation: '“Ni modo” expresses acceptance when something cannot be changed. “Luego nos ponemos de acuerdo” means you can arrange another time.' },
  { id: 'choice-20', level: 'intermediate', type: 'choice', prompt: 'Someone says “Está medio complicado llegar a esa hora”. What are they probably implying?', options: ['It may be difficult to arrive at that time.', 'They are asking you to make it more complicated.', 'They have already arrived.'], answer: 'It may be difficult to arrive at that time.', explanation: '“Medio” often softens a statement and means “somewhat” or “kind of”. The speaker may be indirectly expressing a problem.' },
  { id: 'choice-21', level: 'intermediate', type: 'choice', prompt: 'Your friend says “¿Me haces paro con esto?”. What is the best interpretation?', options: ['Can you help me out with this?', 'Can you stop the music?', 'Can you lend me your car permanently?'], answer: 'Can you help me out with this?', explanation: '“Hacer paro” is informal Mexican Spanish for helping someone or doing them a favor.' },
  { id: 'choice-22', level: 'intermediate', type: 'choice', prompt: 'You want to say that a restaurant is crowded but still worth visiting. Which sounds most natural?', options: ['Está llenísimo, pero sí vale la pena.', 'Es lleno mucho, pero vale la pena.', 'Está llenar, pero vale pena sí.'], answer: 'Está llenísimo, pero sí vale la pena.', explanation: '“Llenísimo” is an emphatic form of “lleno”. “Valer la pena” means to be worth it.' },
  { id: 'choice-23', level: 'intermediate', type: 'choice', prompt: 'A colleague says “Ahorita lo checo”. What is the most careful interpretation?', options: ['They will check it shortly; confirm a deadline if timing matters.', 'They have checked it already.', 'They refuse to check it.'], answer: 'They will check it shortly; confirm a deadline if timing matters.', explanation: '“Ahorita” is context-dependent. In a work situation, ask for a specific time if you need certainty.' },

  { id: 'blank-19', level: 'intermediate', type: 'blank', prompt: 'Complete the idiom: “No te preocupes, yo te _____ la mano.” (I’ll help you.)', answer: 'echo', explanation: '“Echar la mano” means to help. In this sentence, “echo” is the first-person form of “echar”.' },
  { id: 'blank-20', level: 'intermediate', type: 'blank', prompt: 'Complete the natural response: “¿Te late ir por unos tacos?” — “Sí, me _____”.', answer: 'late', explanation: '“¿Te late…?” means “Are you up for…?” or “Does … sound good to you?”' },
  { id: 'blank-21', level: 'intermediate', type: 'blank', prompt: 'Complete the sentence: “Se me _____ el camión y llegué tarde.” (I missed the bus.)', answer: 'fue', explanation: '“Se me fue el camión” is a common way to say you missed the bus. The construction presents it as something that happened to you.' },
  { id: 'blank-22', level: 'intermediate', type: 'blank', prompt: 'Complete the expression: “Ese plan suena bien, _____ que sí.” (That plan sounds good, absolutely.)', answer: 'claro', explanation: '“Claro que sí” is a natural emphatic way to agree.' },
  { id: 'blank-23', level: 'intermediate', type: 'blank', prompt: 'Complete the sentence: “No pude ir porque _____ trabajando.” (I couldn’t go because I was working.)', answer: 'estaba', explanation: 'Use the imperfect “estaba” to describe an ongoing background action in the past.' },

  { id: 'order-19', level: 'intermediate', type: 'order', prompt: 'Tell your friend: “I ran out of money, so I’m staying in today.”', words: ['me', 'quedó', 'sin', 'lana', 'así', 'que', 'hoy', 'me', 'quedo', 'en', 'casa'], answer: 'Me quedé sin lana así que hoy me quedo en casa', explanation: '“Quedarse sin lana” means to run out of money. “Me quedé” is past; “me quedo” describes today’s decision.' },
  { id: 'order-20', level: 'intermediate', type: 'order', prompt: 'Make a natural suggestion: “If you want, we can meet up later.”', words: ['Si', 'quieres', 'podemos', 'vernos', 'más', 'al', 'rato'], answer: 'Si quieres podemos vernos más al rato', explanation: '“Si quieres…” softens a suggestion. “Más al rato” means later on.' },
  { id: 'order-21', level: 'intermediate', type: 'order', prompt: 'Say: “I didn’t catch what you said; could you repeat it?”', words: ['No', 'alcancé', 'a', 'escuchar', 'lo', 'que', 'dijiste', '¿me', 'lo', 'repites', '?'], answer: 'No alcancé a escuchar lo que dijiste ¿me lo repites?', explanation: '“No alcancé a escuchar” is a natural way to say you did not quite hear something.' },
  { id: 'order-22', level: 'intermediate', type: 'order', prompt: 'Say: “The place is a bit far, but we can get there by bus.”', words: ['El', 'lugar', 'está', 'algo', 'lejos', 'pero', 'podemos', 'llegar', 'en', 'camión'], answer: 'El lugar está algo lejos pero podemos llegar en camión', explanation: '“Algo lejos” means somewhat far. In much of Mexico, “camión” can mean a bus.' },
  { id: 'order-23', level: 'intermediate', type: 'order', prompt: 'Tell someone: “I’ll let you know when I’m on my way.”', words: ['Te', 'aviso', 'cuando', 'ya', 'vaya', 'en', 'camino'], answer: 'Te aviso cuando ya vaya en camino', explanation: '“Te aviso” means “I’ll let you know”. The subjunctive “vaya” is used after “cuando” for a future action.' },

  // Advanced: register, implication, idioms, and more nuanced Mexican usage.
  { id: 'choice-24', level: 'advanced', type: 'choice', prompt: 'A Mexican coworker says “Ahorita lo vemos” during a meeting. What is the safest response if the issue is urgent?', options: ['Ask politely for a specific time to review it.', 'Assume it will be handled in the next minute.', 'Treat it as a definite refusal.'], answer: 'Ask politely for a specific time to review it.', explanation: '“Ahorita” does not give a precise deadline. In a professional context, clarify: “¿Te parece si lo revisamos antes de las tres?”' },
  { id: 'choice-25', level: 'advanced', type: 'choice', prompt: 'A friend says “No es por nada, pero tu coche necesita una buena revisada”. What is the likely communicative function?', options: ['They are softening a criticism or concern.', 'They are saying the car is perfect.', 'They are asking you to sell the car immediately.'], answer: 'They are softening a criticism or concern.', explanation: '“No es por nada, pero…” often introduces a criticism, warning, or uncomfortable observation.' },
  { id: 'choice-26', level: 'advanced', type: 'choice', prompt: 'Which response best matches the tone of “¡Qué buena onda que viniste a echarme la mano!”?', options: ['¡Para eso estamos! Qué bueno que se pudo.', 'Exijo una remuneración inmediata.', 'No comprendo la forma de la onda.'], answer: '¡Para eso estamos! Qué bueno que se pudo.', explanation: '“¡Para eso estamos!” is a warm, idiomatic response meaning you are glad to help. It matches the friendly tone.' },
  { id: 'choice-27', level: 'advanced', type: 'choice', prompt: 'Someone says “Se puso pesado el ambiente”. What does this suggest?', options: ['The atmosphere became tense or uncomfortable.', 'The room became physically heavier.', 'The party became more expensive.'], answer: 'The atmosphere became tense or uncomfortable.', explanation: '“Pesado” can describe a tense, unpleasant, or difficult atmosphere, not just physical weight.' },
  { id: 'choice-28', level: 'advanced', type: 'choice', prompt: 'Which phrase is the most tactful way to disagree with a host’s suggestion?', options: ['Está buena la idea, pero creo que hoy no se va a poder.', 'Esa idea está de la chingada.', 'Ni de chiste hago eso, cállate.'], answer: 'Está buena la idea, pero creo que hoy no se va a poder.', explanation: 'This softens disagreement and preserves rapport. Strong slang may sound rude, especially with someone you do not know well.' },
  { id: 'choice-29', level: 'advanced', type: 'choice', prompt: 'A friend says “Me dejó plantado”. What happened?', options: ['Someone failed to show up for an arranged meeting.', 'Someone left a plant at their house.', 'Someone offered them a job.'], answer: 'Someone failed to show up for an arranged meeting.', explanation: '“Dejar plantado a alguien” means to stand someone up or fail to show up for a plan.' },
  { id: 'choice-30', level: 'advanced', type: 'choice', prompt: 'In “No le busques tres pies al gato”, what is the speaker advising?', options: ['Do not overcomplicate things or look for problems that are not there.', 'Look carefully for a missing animal.', 'Ask three people before deciding.'], answer: 'Do not overcomplicate things or look for problems that are not there.', explanation: 'This idiom advises someone not to complicate a situation unnecessarily. It is understood in Mexico and elsewhere in the Spanish-speaking world.' },

  { id: 'blank-24', level: 'advanced', type: 'blank', prompt: 'Complete the expression: “No hay que hacer _____ en un vaso de agua.” (Don’t make a big deal out of a small thing.)', answer: 'tormenta', explanation: '“Hacer una tormenta en un vaso de agua” means to exaggerate or make a big problem out of something small.' },
  { id: 'blank-25', level: 'advanced', type: 'blank', prompt: 'Complete the expression: “Me quedé con la boca _____.” (I was left speechless / amazed.)', answer: 'abierta', explanation: '“Quedarse con la boca abierta” means to be astonished or left speechless.' },
  { id: 'blank-26', level: 'advanced', type: 'blank', prompt: 'Complete the saying: “Más vale tarde que _____.”', answer: 'nunca', explanation: '“Más vale tarde que nunca” means “better late than never”.' },
  { id: 'blank-27', level: 'advanced', type: 'blank', prompt: 'Complete the sentence: “Por más que le expliqué, no _____ a entender.” (No matter how much I explained, they did not manage to understand.)', answer: 'logró', explanation: '“Lograr + infinitive” means to manage to do something. “No logró entender” means they did not manage to understand.' },
  { id: 'blank-28', level: 'advanced', type: 'blank', prompt: 'Complete the idiom: “A caballo regalado no se le mira el _____.”', answer: 'diente', explanation: 'This saying means you should not criticize a gift or something received for free.' },
  { id: 'blank-29', level: 'advanced', type: 'blank', prompt: 'Complete the natural phrase: “No es que no quiera ayudarte; es que no _____ cómo hacerlo.”', answer: 'sé', explanation: '“No es que…” introduces an explanation or qualification. “Sé” is the first-person present of “saber”.' },
  { id: 'blank-30', level: 'advanced', type: 'blank', prompt: 'Complete the expression: “Le salió el tiro por la _____.” (Their plan backfired.)', answer: 'culata', explanation: '“Salir el tiro por la culata” means that an attempt or plan had the opposite result.' },

  { id: 'order-24', level: 'advanced', type: 'order', prompt: 'Explain tactfully: “I would help you, but I have already made other plans.”', words: ['Con', 'gusto', 'te', 'ayudaría', 'pero', 'ya', 'había', 'hecho', 'otros', 'planes'], answer: 'Con gusto te ayudaría pero ya había hecho otros planes', explanation: 'The conditional “ayudaría” softens the offer, while “había hecho” places the plans before the current moment.' },
  { id: 'order-25', level: 'advanced', type: 'order', prompt: 'Say: “It is not that I disagree; I just see it differently.”', words: ['No', 'es', 'que', 'esté', 'en', 'desacuerdo', 'simplemente', 'lo', 'veo', 'de', 'otra', 'manera'], answer: 'No es que esté en desacuerdo simplemente lo veo de otra manera', explanation: '“No es que…” followed by the subjunctive “esté” frames a nuanced clarification rather than a blunt disagreement.' },
  { id: 'order-26', level: 'advanced', type: 'order', prompt: 'Say: “By the time we arrived, the place was already packed.”', words: ['Para', 'cuando', 'llegamos', 'el', 'lugar', 'ya', 'estaba', 'hasta', 'el', 'tope'], answer: 'Para cuando llegamos el lugar ya estaba hasta el tope', explanation: '“Estar hasta el tope” means to be completely full or packed.' },
  { id: 'order-27', level: 'advanced', type: 'order', prompt: 'Say: “If I had known, I would have told you beforehand.”', words: ['Si', 'lo', 'hubiera', 'sabido', 'te', 'habría', 'avisado', 'antes'], answer: 'Si lo hubiera sabido te habría avisado antes', explanation: 'This is a past hypothetical: pluperfect subjunctive in the “si” clause and conditional perfect in the result.' },
  { id: 'order-28', level: 'advanced', type: 'order', prompt: 'Say: “The thing is, we are running out of time.”', words: ['El', 'chiste', 'es', 'que', 'se', 'nos', 'está', 'acabando', 'el', 'tiempo'], answer: 'El chiste es que se nos está acabando el tiempo', explanation: '“El chiste es que…” is a colloquial way to introduce the main point: “The thing is…”.' },
  { id: 'order-29', level: 'advanced', type: 'order', prompt: 'Say: “I would rather you tell me directly.”', words: ['Preferiría', 'que', 'me', 'lo', 'dijeras', 'directamente'], answer: 'Preferiría que me lo dijeras directamente', explanation: 'The conditional “preferiría” expresses a preference; the imperfect subjunctive “dijeras” follows “que”.' },
  { id: 'order-30', level: 'advanced', type: 'order', prompt: 'Say: “Although it was expensive, it was worth every peso.”', words: ['Aunque', 'estuvo', 'caro', 'valió', 'cada', 'peso'], answer: 'Aunque estuvo caro valió cada peso', explanation: '“Valer cada peso” emphasizes that something was worth its price. In a more neutral register, you can say “valió la pena”.' },

];

function getInteractiveExerciseLevel(item: InteractivePracticeItem): InteractivePracticeLevel {
  if (item.level) return item.level;
  const match = item.id.match(/-(\d+)$/);
  const itemNumber = Number(match?.[1] ?? 0);
  if (itemNumber <= 7) return 'beginner';
  if (itemNumber <= 12) return 'intermediate';
  return 'advanced';
}

const REVIEW_STORAGE_KEY = 'mexicanSlangReviewItems';

type InteractiveProgress = {
  totalAttempts: number;
  correctAnswers: number;
  mistakes: { id: string; level: string; prompt: string; answer: string; date: string; attempts?: number }[];
  completedIds: string[];
  byLevel: Record<string, { attempts: number; correct: number }>;
};

const INTERACTIVE_PROGRESS_KEY = 'mexicanSlangInteractiveProgress';
const EMPTY_INTERACTIVE_PROGRESS: InteractiveProgress = {
  totalAttempts: 0,
  correctAnswers: 0,
  mistakes: [],
  completedIds: [],
  byLevel: {
    beginner: { attempts: 0, correct: 0 },
    intermediate: { attempts: 0, correct: 0 },
    advanced: { attempts: 0, correct: 0 },
  },
};


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
  {
    scene: 'Resolving a problem at a hotel',
    location: '🏨 Hotel reception',
    dialogue: [
      { speaker: 'Receptionist', line: 'Buenas tardes, ¿en qué le puedo ayudar?', translation: 'Good afternoon, how can I help you?', prompt: 'Explain politely that the air conditioning in your room is not working.', options: ['Buenas tardes. El aire acondicionado de mi habitación no funciona.', 'Mi habitación no trabaja el aire.', 'Quiero otro clima porque sí.'], correct: 'Buenas tardes. El aire acondicionado de mi habitación no funciona.', explanation: 'State the problem clearly and politely. “No funciona” is the natural phrase for something that is not working.', tip: 'You can add “¿Podrían revisarlo, por favor?” to request assistance.' },
      { speaker: 'Receptionist', line: 'Claro. ¿Desde cuándo tiene ese problema?', translation: 'Of course. Since when have you had that problem?', prompt: 'Say that it has been happening since last night.', options: ['Desde anoche.', 'Por mañana pasada.', 'Ayer en la noche desde será.'], correct: 'Desde anoche.', explanation: '“Desde anoche” means “since last night”. “Desde” marks the starting point of a continuing situation.', tip: 'For a full sentence: “No funciona desde anoche”.' },
      { speaker: 'Receptionist', line: 'Mandaremos a alguien a revisarlo.', translation: 'We will send someone to check it.', prompt: 'Ask approximately how long it will take.', options: ['¿Más o menos cuánto tiempo tardará?', '¿Cuánto tiempo tiene usted?', '¿A qué hora cuesta?'], correct: '¿Más o menos cuánto tiempo tardará?', explanation: '“Más o menos” softens the question and asks for an estimate.', tip: '“¿En cuánto tiempo?” is shorter and also natural.' },
    ],
  },
  {
    scene: 'Handling a misunderstanding with a friend',
    location: '🤝 Friends',
    dialogue: [
      { speaker: 'Friend', line: 'Oye, sentí que te molestaste ayer.', translation: 'Hey, I felt like you got upset yesterday.', prompt: 'Respond calmly that it was not your intention and ask what gave that impression.', options: ['No era mi intención. ¿Qué te hizo pensar eso?', 'No te metas, siempre inventas cosas.', 'Yo no intención era de ayer.'], correct: 'No era mi intención. ¿Qué te hizo pensar eso?', explanation: 'This response acknowledges their feelings without becoming defensive and invites clarification.', tip: '“No era mi intención” is useful for repairing misunderstandings.' },
      { speaker: 'Friend', line: 'Cuando te saludé, casi no me contestaste.', translation: 'When I greeted you, you barely answered me.', prompt: 'Explain that you were distracted because you were worried about something.', options: ['Perdón, traía la cabeza en otra cosa y no me di cuenta.', 'No me importa que me saludes.', 'Mi cabeza estaba otra cosa trayendo.'], correct: 'Perdón, traía la cabeza en otra cosa y no me di cuenta.', explanation: '“Traer la cabeza en otra cosa” means to have your mind on something else.', tip: 'An apology plus a brief explanation often sounds more natural than a literal translation.' },
      { speaker: 'Friend', line: 'Está bien, solo quería aclararlo.', translation: 'It’s okay, I just wanted to clear it up.', prompt: 'Close the conversation warmly and suggest getting together soon.', options: ['Qué bueno que lo hablamos. A ver si nos vemos esta semana.', 'Ya no hables de eso nunca.', 'Está bien, yo aclaración quiero.'], correct: 'Qué bueno que lo hablamos. A ver si nos vemos esta semana.', explanation: '“Qué bueno que lo hablamos” acknowledges the conversation; “a ver si nos vemos” makes a friendly suggestion.', tip: '“A ver si…” often introduces a casual plan, not a guaranteed appointment.' },
    ],
  },
  {
    scene: 'Negotiating a repair with a landlord',
    location: '🛠️ Apartment',
    dialogue: [
      { speaker: 'Landlord', line: '¿Qué pasó con la fuga?', translation: 'What happened with the leak?', prompt: 'Explain that the leak got worse overnight and water is reaching the floor.', options: ['La fuga empeoró durante la noche y el agua ya está llegando al piso.', 'La fuga está mejor peor noche.', 'El piso tomó agua anoche.'], correct: 'La fuga empeoró durante la noche y el agua ya está llegando al piso.', explanation: '“Empeoró” means it got worse. “Está llegando al piso” explains the current consequence.', tip: 'For urgent repairs, describe the damage and when it started.' },
      { speaker: 'Landlord', line: 'Voy a mandar al plomero mañana.', translation: 'I will send the plumber tomorrow.', prompt: 'Politely explain that it is urgent and ask whether someone can come today.', options: ['Entiendo, pero sí urge. ¿Habría posibilidad de que alguien viniera hoy?', 'Mañana no sirve, hazlo ahora.', 'El plomero posibilidad hoy mañana.'], correct: 'Entiendo, pero sí urge. ¿Habría posibilidad de que alguien viniera hoy?', explanation: '“¿Habría posibilidad…?” is a tactful, polite way to make a request. “Sí urge” communicates urgency.', tip: 'The imperfect subjunctive “viniera” is common after this polite construction.' },
      { speaker: 'Landlord', line: 'Déjame ver si consigo a alguien.', translation: 'Let me see if I can find someone.', prompt: 'Ask them to let you know as soon as they have an answer.', options: ['¿Me avisa en cuanto sepa algo, por favor?', '¿Me avisó cuando supo ayer?', 'Avísame algo en cuanto.'], correct: '¿Me avisa en cuanto sepa algo, por favor?', explanation: '“En cuanto sepa algo” means “as soon as you know something”. The subjunctive “sepa” follows this future time expression.', tip: 'Use “¿Me avisa…?” for polite requests.' },
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
  {
    phrase: '¿Me podría…?',
    question: 'You are speaking to someone you do not know and need them to repeat a direction. Which request is the most polite?',
    options: ['¿Me podría repetir la dirección, por favor?', 'Repíteme eso ya.', '¿Tú repites dirección?'],
    correct: '¿Me podría repetir la dirección, por favor?',
    example: 'Disculpe, ¿me podría repetir la dirección?',
  },
  {
    phrase: 'Se me olvidó',
    question: 'You left your passport at the hotel. What is the natural way to explain this?',
    options: ['Se me olvidó el pasaporte en el hotel.', 'Me olvidé el pasaporte al hotel.', 'Soy olvidado con pasaporte.'],
    correct: 'Se me olvidó el pasaporte en el hotel.',
    example: '¡Se me olvidó el cargador en el cuarto!',
  },
  {
    phrase: 'Quedar',
    question: 'A friend asks “¿A qué hora quedamos?”. What are they asking?',
    options: ['What time shall we meet?', 'What time do we finish eating?', 'Where should we leave the keys?'],
    correct: 'What time shall we meet?',
    example: '¿Quedamos a las siete afuera del cine?',
  },
  {
    phrase: 'Me queda',
    question: 'You try on a shirt and say “Me queda grande”. What do you mean?',
    options: ['It is too big on me.', 'It is expensive.', 'I have to leave it here.'],
    correct: 'It is too big on me.',
    example: 'La camisa me queda un poco grande.',
  },
  {
    phrase: '¿Cómo llego…?',
    question: 'You are lost and want directions to the museum. Which question is natural?',
    options: ['¿Cómo llego al museo desde aquí?', '¿Cómo soy el museo?', '¿Dónde llego el museo?'],
    correct: '¿Cómo llego al museo desde aquí?',
    example: 'Disculpe, ¿cómo llego al centro desde aquí?',
  },
  {
    phrase: 'Aunque',
    question: 'Choose the sentence that correctly means “Even though it is raining, we are going out.”',
    options: ['Aunque está lloviendo, vamos a salir.', 'Aunque llueve, salimos ayer.', 'A pesar que está lloviendo, vamos salir a.'],
    correct: 'Aunque está lloviendo, vamos a salir.',
    example: 'Aunque estoy cansado, voy a acompañarte.',
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
    {
      phrase: 'Me late',
      question: 'A friend asks “¿Te late ir a Chapultepec el domingo?”. What are they asking?',
      options: ['Are you up for going to Chapultepec on Sunday?', 'Do you know the way to Chapultepec?', 'Do you dislike Sundays?'],
      correct: 'Are you up for going to Chapultepec on Sunday?',
      example: 'Me late el plan, ¿a qué hora salimos?',
    },
    {
      phrase: 'Hacer paro',
      question: 'Your neighbor says “¿Me haces paro y recibes un paquete?”. What do they want?',
      options: ['A favor or a bit of help.', 'A ride to the police station.', 'A discount on the package.'],
      correct: 'A favor or a bit of help.',
      example: '¿Me haces paro y riegas mis plantas?',
    },
    {
      phrase: 'Echar relajo',
      question: 'Your classmates “estaban echando relajo” after class. What were they doing?',
      options: ['Joking around and having fun.', 'Doing serious paperwork.', 'Arguing about a bill.'],
      correct: 'Joking around and having fun.',
      example: 'Nos quedamos echando relajo después de clase.',
    },
    {
      phrase: 'Está de lujo',
      question: 'Someone says “El departamento está de lujo”. What do they mean?',
      options: ['The apartment is excellent or really nice.', 'The apartment is overpriced.', 'The apartment is empty.'],
      correct: 'The apartment is excellent or really nice.',
      example: 'La comida de ese lugar está de lujo.',
    },
    {
      phrase: 'No te claves',
      question: 'A friend says “No te claves con ese comentario”. What are they advising?',
      options: ['Do not dwell on that comment or take it too personally.', 'Write the comment down.', 'Repeat the comment louder.'],
      correct: 'Do not dwell on that comment or take it too personally.',
      example: 'No te claves, mañana será otro día.',
    },
    {
      phrase: 'Me cayó el veinte',
      question: 'After a long explanation, someone says “¡Ya me cayó el veinte!”. What happened?',
      options: ['They finally understood.', 'They received twenty pesos.', 'They forgot the explanation.'],
      correct: 'They finally understood.',
      example: 'Hasta que vi el ejemplo me cayó el veinte.',
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
    {
      phrase: 'Se armó',
      question: 'Your friends say “Se armó la carne asada”. What does that suggest?',
      options: ['The barbecue gathering is happening / has been organized.', 'The barbecue caught fire by accident.', 'The event has been cancelled.'],
      correct: 'The barbecue gathering is happening / has been organized.',
      example: 'El sábado se armó la reunión en casa de Ana.',
    },
    {
      phrase: 'Andar corto de lana',
      question: 'If someone says “Esta semana ando corto de lana”, what do they mean?',
      options: ['They are short on money this week.', 'They need smaller banknotes.', 'They are working fewer hours.'],
      correct: 'They are short on money this week.',
      example: 'No voy a salir; ando corto de lana.',
    },
    {
      phrase: 'Está de pelos',
      question: 'In a positive context, “¡Está de pelos!” means…',
      options: ['It is fantastic or impressive.', 'It is hairy.', 'It is dangerous and should be avoided.'],
      correct: 'It is fantastic or impressive.',
      example: 'La vista desde aquí está de pelos.',
    },
    {
      phrase: 'Dar el avión',
      question: 'If someone “te da el avión”, what might they be doing?',
      options: ['Pretending to listen or agreeing just to get you to stop.', 'Offering to take you to the airport.', 'Giving you directions.'],
      correct: 'Pretending to listen or agreeing just to get you to stop.',
      example: 'Le expliqué todo, pero creo que solo me dio el avión.',
    },
    {
      phrase: 'Ponerse las pilas',
      question: 'Your teacher says “Hay que ponerse las pilas para el examen”. What do you need to do?',
      options: ['Get focused and make an effort.', 'Buy new batteries.', 'Leave the classroom.'],
      correct: 'Get focused and make an effort.',
      example: 'Me tengo que poner las pilas con el español.',
    },
    {
      phrase: 'No dar una',
      question: 'Someone says “Hoy no doy una”. What are they expressing?',
      options: ['Nothing seems to be going right for them today.', 'They are refusing to give anything away.', 'They scored perfectly.'],
      correct: 'Nothing seems to be going right for them today.',
      example: 'Se me olvidaron las llaves y perdí el camión; hoy no doy una.',
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


type CultureEntry = {
  phrase: string;
  meaning: string;
  context: string;
  register: string;
  example: string;
  translation: string;
  note: string;
  category: 'Everyday slang' | 'Food & social life' | 'Useful expressions' | 'Customs & traditions' | 'Regional expressions';
};

const cultureEntries: CultureEntry[] = [
  {
    phrase: '¿Qué onda?',
    meaning: 'What’s up? / How’s it going?',
    context: 'A casual greeting with friends, peers, and people you know.',
    register: 'Informal · Friendly',
    example: '¡Qué onda! ¿Cómo te fue ayer?',
    translation: 'Hey! How did it go yesterday?',
    note: 'Avoid it in formal emails or very formal first meetings. “Hola, ¿cómo está?” is more neutral.',
    category: 'Everyday slang',
  },
  {
    phrase: 'No manches',
    meaning: 'No way! / You’re kidding!',
    context: 'A reaction to surprising, unbelievable, or frustrating news.',
    register: 'Informal · Mild slang',
    example: '¿Te dieron vacaciones todo el mes? ¡No manches!',
    translation: 'You got the whole month off? No way!',
    note: '“No mames” is a stronger, vulgar version. Learn it to understand it, but be careful using it.',
    category: 'Everyday slang',
  },
  {
    phrase: 'Ahorita',
    meaning: 'Right now, in a little while, or sometime soon — depending on context.',
    context: 'Used in everyday conversation when talking about doing something soon.',
    register: 'Neutral to informal · Context-dependent',
    example: 'Ahorita te mando el mensaje.',
    translation: 'I’ll send you the message in a bit.',
    note: 'It does not always mean this exact second. If timing matters, ask “¿En cuánto tiempo?”.',
    category: 'Useful expressions',
  },
  {
    phrase: '¡Aguas!',
    meaning: 'Watch out! / Be careful!',
    context: 'A quick warning when someone is near a hazard or might bump into something.',
    register: 'Informal · Warning',
    example: '¡Aguas con el escalón!',
    translation: 'Watch out for the step!',
    note: 'Usually a warning, not an instruction to drink water.',
    category: 'Useful expressions',
  },
  {
    phrase: '¡Qué padre!',
    meaning: 'That’s cool! / That’s awesome!',
    context: 'A positive reaction to an idea, place, object, or experience.',
    register: 'Informal · Positive',
    example: '¡Qué padre está este lugar!',
    translation: 'This place is so cool!',
    note: 'Widely understood in Mexico. Other regions may prefer expressions such as “qué chido”.',
    category: 'Everyday slang',
  },
  {
    phrase: 'Chamba',
    meaning: 'Work / job',
    context: 'Casual conversations about your job, workload, or finding work.',
    register: 'Informal · Common',
    example: 'Hoy tengo mucha chamba.',
    translation: 'I have a lot of work today.',
    note: '“Trabajo” is the more neutral word and works in formal settings.',
    category: 'Everyday slang',
  },
  {
    phrase: 'La lana',
    meaning: 'Money',
    context: 'Casual conversations about paying, spending, or being short on money.',
    register: 'Informal · Slang',
    example: 'Ahorita no traigo lana.',
    translation: 'I don’t have money on me right now.',
    note: 'Literally, “lana” means wool. In this expression it means money.',
    category: 'Everyday slang',
  },
  {
    phrase: '¿Me da…?',
    meaning: 'Could I have…? / Can I get…?',
    context: 'A polite, common way to order food or ask a vendor for something.',
    register: 'Polite · Everyday',
    example: '¿Me da tres tacos, por favor?',
    translation: 'Could I have three tacos, please?',
    note: '“¿Me das…?” is more familiar. “¿Me da…?” is a safe, polite choice with someone you do not know.',
    category: 'Food & social life',
  },
  {
    phrase: 'Con todo',
    meaning: 'With all the usual toppings',
    context: 'At many taco stands, this often means the standard toppings, such as onion and cilantro; toppings vary by place.',
    register: 'Everyday · Food',
    example: 'Sí, con todo, por favor.',
    translation: 'Yes, with everything, please.',
    note: 'If you want to leave something out, say “sin cebolla” or “sin cilantro”. Ask what is included if unsure.',
    category: 'Food & social life',
  },
  {
    phrase: '¿Cuánto sería?',
    meaning: 'How much would that be?',
    context: 'A natural way to ask the total at a market, café, or shop.',
    register: 'Polite · Everyday',
    example: '¿Cuánto sería por todo?',
    translation: 'How much would it be for everything?',
    note: 'You can also ask “¿Cuánto es en total?”.',
    category: 'Food & social life',
  },
  {
    phrase: '¡Provecho!',
    meaning: 'Enjoy your meal!',
    context: 'A courteous expression said to people who are eating, including people nearby.',
    register: 'Polite · Social',
    example: '¡Buen provecho!',
    translation: 'Enjoy your meal!',
    note: 'You may hear “provecho” or “buen provecho”. A simple “gracias” is a natural reply.',
    category: 'Food & social life',
  },
  {
    phrase: '¡Va!',
    meaning: 'Okay! / Sounds good!',
    context: 'Agreeing to a suggestion or confirming a plan in casual conversation.',
    register: 'Informal · Friendly',
    example: '—Nos vemos a las seis. —¡Va!',
    translation: '—See you at six. —Sounds good!',
    note: 'A broadly useful casual expression. “Jalo” is more colloquial and means “I’m in”.',
    category: 'Everyday slang',
  },
  {
    phrase: '¿Me regalas…?',
    meaning: 'Could I have…? / Could you give me…?',
    context: 'A very common, polite way to ask for something in shops, cafés, and food stalls.',
    register: 'Polite · Everyday',
    example: '¿Me regalas un café americano, por favor?',
    translation: 'Could I have an Americano coffee, please?',
    note: 'It is not necessarily asking for something free. In many Mexican contexts, “regalar” is a friendly way to request a product or service you will pay for.',
    category: 'Food & social life',
  },
  {
    phrase: '¡Buen provecho!',
    meaning: 'Enjoy your meal!',
    context: 'Said when people are eating, when you arrive at a table, or when you leave someone who is still eating.',
    register: 'Polite · Social',
    example: '¡Buen provecho! ¿Está rico?',
    translation: 'Enjoy your meal! Is it good?',
    note: 'You may hear “provecho” in restaurants and at shared meals. A simple “gracias” is a natural response.',
    category: 'Food & social life',
  },
  {
    phrase: 'La cuenta, por favor',
    meaning: 'The bill, please.',
    context: 'Used to ask for the check at a restaurant or café.',
    register: 'Polite · Neutral',
    example: 'Cuando pueda, ¿me trae la cuenta, por favor?',
    translation: 'When you have a moment, could you bring me the bill, please?',
    note: 'In a relaxed restaurant, getting the server’s attention politely is better than snapping your fingers or shouting.',
    category: 'Food & social life',
  },
  {
    phrase: 'La sobremesa',
    meaning: 'Time spent talking at the table after a meal.',
    context: 'A social moment when family or friends keep chatting after they finish eating.',
    register: 'Neutral · Cultural term',
    example: 'Después de comer nos quedamos de sobremesa.',
    translation: 'After eating, we stayed at the table chatting.',
    note: 'The meal is over, but the gathering is not. Conversation can be as important as the food.',
    category: 'Food & social life',
  },
  {
    phrase: 'En un tianguis',
    meaning: 'At an open-air street market.',
    context: 'Tianguis are markets set up on particular streets and days, often selling food, clothes, household goods, and more.',
    register: 'Everyday · Cultural term',
    example: 'Los martes pongo un puesto en el tianguis.',
    translation: 'On Tuesdays I set up a stall at the street market.',
    note: 'You can ask “¿Cuánto cuesta?” and, where bargaining is customary, “¿Cuál es su mejor precio?”. Not every seller negotiates.',
    category: 'Food & social life',
  },
  {
    phrase: '¿Qué rollo?',
    meaning: 'What’s up? / What’s going on?',
    context: 'An informal greeting or a way to ask what is happening.',
    register: 'Informal · Casual',
    example: '¿Qué rollo? ¿Sí vas a venir al partido?',
    translation: 'What’s up? Are you coming to the game?',
    note: 'Very casual. With someone you do not know well, start with “Hola, ¿cómo está?”.',
    category: 'Regional expressions',
  },
  {
    phrase: 'Está chido',
    meaning: 'It’s cool / It’s great.',
    context: 'A casual positive reaction, especially common in central Mexico and widely understood elsewhere.',
    register: 'Informal · Slang',
    example: 'Está chido el mural de esa calle.',
    translation: 'The mural on that street is cool.',
    note: '“Chido” is informal. “Está muy bien” is a safer neutral alternative.',
    category: 'Regional expressions',
  },
  {
    phrase: 'Ocupo…',
    meaning: 'I need…',
    context: 'Used by many speakers in western and northern Mexico as an everyday alternative to “necesito”.',
    register: 'Informal to neutral · Regional usage',
    example: 'Ocupo comprar agua antes de salir.',
    translation: 'I need to buy water before leaving.',
    note: 'You will hear it in places such as Jalisco, but usage varies. “Necesito” is understood throughout the Spanish-speaking world.',
    category: 'Regional expressions',
  },
  {
    phrase: '¡Arre!',
    meaning: 'Okay! / Let’s do it!',
    context: 'A very informal expression of agreement or enthusiasm, associated especially with northern and northwestern speech but heard elsewhere too.',
    register: 'Very informal · Regional',
    example: '¿Nos vemos a las ocho? —¡Arre!',
    translation: 'Shall we meet at eight? —Sounds good!',
    note: 'Use it with friends who speak casually. It may sound out of place in formal or professional situations.',
    category: 'Regional expressions',
  },
  {
    phrase: '¿Mande?',
    meaning: 'Pardon? / What was that?',
    context: 'A polite response when you did not hear or understand someone, often used instead of “¿Qué?”.',
    register: 'Polite · Everyday',
    example: '¿Mande? No alcancé a escuchar.',
    translation: 'Pardon? I didn’t quite hear you.',
    note: 'It is common in Mexico, but preferences differ by person and region. “¿Cómo?” or “¿Perdón?” also work.',
    category: 'Regional expressions',
  },
  {
    phrase: 'Las posadas',
    meaning: 'Community celebrations held in the days before Christmas.',
    context: 'Often include songs, food, a piñata, and time with family, neighbors, or friends.',
    register: 'Cultural · Seasonal',
    example: 'El viernes tenemos posada en la oficina.',
    translation: 'We have a Christmas posada at the office on Friday.',
    note: 'Traditions vary by family and community. Some posadas are religious; others are mostly social gatherings.',
    category: 'Customs & traditions',
  },
  {
    phrase: 'Día de Muertos',
    meaning: 'A tradition of remembering and honoring loved ones who have died.',
    context: 'Families may create ofrendas, visit cemeteries, share food, and tell stories about relatives.',
    register: 'Cultural · Commemorative',
    example: 'En mi casa ponemos una ofrenda para recordar a la familia.',
    translation: 'At home we set up an altar to remember our family.',
    note: 'Practices differ across Mexico. It is not simply “Mexican Halloween”; approach the tradition with respect and curiosity.',
    category: 'Customs & traditions',
  },
  {
    phrase: '¿Te invito algo?',
    meaning: 'Can I get you something? / Would you like me to treat you?',
    context: 'A friendly offer to buy someone a drink, snack, or small item.',
    register: 'Friendly · Social',
    example: 'Voy por un café, ¿te invito algo?',
    translation: 'I’m going to get a coffee; can I get you something?',
    note: 'It is an offer, not an obligation. A simple “gracias, qué amable” is a natural response.',
    category: 'Customs & traditions',
  },
  {
    phrase: 'Saludar de beso',
    meaning: 'To greet someone with a cheek kiss.',
    context: 'In some social circles, people greet friends or relatives with a cheek kiss; others prefer a handshake, hug, or verbal greeting.',
    register: 'Social custom · Context-dependent',
    example: 'Cuando llegué, saludé de beso a mis amigas.',
    translation: 'When I arrived, I greeted my friends with a cheek kiss.',
    note: 'Do not assume everyone wants physical contact. Follow the other person’s lead and respect personal boundaries.',
    category: 'Customs & traditions',
  },
  {
    phrase: 'Hacer sobremesa',
    meaning: 'To stay at the table talking after a meal.',
    context: 'A social custom in which conversation continues after eating; it is not about ordering another course.',
    register: 'Neutral · Cultural',
    example: 'Después de la comida nos quedamos haciendo sobremesa.',
    translation: 'After the meal, we stayed at the table chatting.',
    note: 'A useful cultural concept: the meal may be finished, but the social gathering continues. Do not rush the moment.',
    category: 'Customs & traditions',
  },
  {
    phrase: 'Ahí nos vemos',
    meaning: 'See you there / I’ll see you there.',
    context: 'Used to confirm an informal plan when the place is already understood.',
    register: 'Informal · Everyday',
    example: 'Entonces a las ocho en la entrada. Ahí nos vemos.',
    translation: 'So, at eight at the entrance. See you there.',
    note: 'It confirms a plan, but it does not itself specify a location or exact arrangement. Make sure those details are clear.',
    category: 'Everyday slang',
  },
  {
    phrase: 'Con permiso',
    meaning: 'Excuse me / May I get by?',
    context: 'Used to pass in front of someone, leave a crowded row, or politely interrupt.',
    register: 'Polite · Everyday',
    example: 'Con permiso, ¿me deja pasar?',
    translation: 'Excuse me, could you let me through?',
    note: 'A very useful phrase in markets, buses, restaurants, and crowded public spaces.',
    category: 'Useful expressions',
  },
  {
    phrase: '¿Qué pena?',
    meaning: 'What a shame / How embarrassing, depending on context.',
    context: 'Can express sympathy, embarrassment, or regret. The situation and tone determine the meaning.',
    register: 'Neutral to informal · Context-dependent',
    example: '¡Qué pena que no alcanzaste a llegar!',
    translation: 'What a shame you didn’t make it in time!',
    note: 'Do not assume “pena” always means punishment. In everyday speech it often refers to embarrassment or regret.',
    category: 'Everyday slang',
  },
  {
    phrase: 'Está bien servido',
    meaning: 'A portion is generous / well served.',
    context: 'Often said about food portions at a restaurant or market.',
    register: 'Informal · Food',
    example: 'El plato está muy bien servido.',
    translation: 'The plate has a very generous portion.',
    note: 'This is a useful phrase when describing quantity, not quality alone.',
    category: 'Food & social life',
  },

];

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
  {
    id: 'hotel_problem',
    title: 'At a hotel',
    emoji: '🏨',
    description: 'Explain a problem, ask for a solution, and clarify timing.',
    turns: [
      { speaker: 'Receptionist', spanishLine: 'Buenas tardes, ¿todo está bien con su habitación?', englishMeaning: 'Good afternoon, is everything okay with your room?', prompt: 'Explain in a complete sentence that the air conditioning is not working.', sample: 'Buenas tardes. El aire acondicionado de mi habitación no funciona.', tip: 'Use “no funciona” to explain that an appliance or service is not working.', keywords: ['aire acondicionado', 'no funciona'] },
      { speaker: 'Receptionist', spanishLine: 'Podemos mandar a mantenimiento.', englishMeaning: 'We can send maintenance.', prompt: 'Ask politely when someone can come to check it.', sample: 'Muchas gracias. ¿Más o menos a qué hora podrían venir?', tip: '“¿A qué hora podrían venir?” is polite and uses the conditional to soften the request.', keywords: ['a qué hora', 'a que hora', 'podrían', 'podrian', 'venir'] },
    ],
  },
  {
    id: 'misunderstanding',
    title: 'Clearing up a misunderstanding',
    emoji: '🤝',
    description: 'Respond tactfully, explain yourself, and repair a conversation.',
    turns: [
      { speaker: 'Friend', spanishLine: 'Oye, creo que ayer te molestaste conmigo.', englishMeaning: 'Hey, I think you got upset with me yesterday.', prompt: 'Say that it was not your intention and ask what made them think that.', sample: 'No era mi intención. ¿Qué te hizo pensar eso?', tip: 'Acknowledge the other person and ask an open question instead of immediately defending yourself.', keywords: ['no era mi intención', 'no era mi intencion', 'qué te hizo pensar', 'que te hizo pensar'] },
      { speaker: 'Friend', spanishLine: 'Sentí que casi no me hiciste caso.', englishMeaning: 'I felt like you barely paid attention to me.', prompt: 'Apologize and explain that you had your mind on another problem.', sample: 'Perdón, traía la cabeza en otra cosa y no me di cuenta.', tip: '“Traer la cabeza en otra cosa” is a natural idiom for being distracted or preoccupied.', keywords: ['perdón', 'perdon', 'cabeza en otra cosa', 'no me di cuenta'] },
    ],
  },
  {
    id: 'work_meeting',
    title: 'At a work meeting',
    emoji: '💼',
    description: 'Give an update, explain a delay, and propose a next step.',
    turns: [
      { speaker: 'Colleague', spanishLine: '¿Cómo vamos con el proyecto?', englishMeaning: 'How are we doing with the project?', prompt: 'Explain that most of the work is done but one detail is still pending.', sample: 'Ya terminamos casi todo, pero todavía queda un detalle pendiente.', tip: '“Queda pendiente” is useful in professional contexts for something that remains to be done.', keywords: ['terminamos casi todo', 'casi todo', 'pendiente', 'falta un detalle'] },
      { speaker: 'Colleague', spanishLine: '¿Crees que podamos entregarlo hoy?', englishMeaning: 'Do you think we can deliver it today?', prompt: 'Give a cautious answer: you will confirm after checking one thing.', sample: 'Déjame revisar ese último detalle y te confirmo en un rato.', tip: '“Déjame revisar…” is a natural way to ask for a moment before committing.', keywords: ['déjame revisar', 'dejame revisar', 'te confirmo'] },
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

const SHOP_AVATARS = [
  { id: 'avatar_default', name: 'Explorador', emoji: '🧑‍🎤', price: 0, category: 'Personajes', description: 'Tu avatar inicial.' },
  // Comida
  { id: 'avatar_taco', name: 'Taquero legendario', emoji: '🌮', price: 20, category: 'Comida', description: 'Listo para dominar cualquier taquería.' },
  { id: 'food_chilaquil', name: 'Chilaquil', emoji: '🍳', price: 75, category: 'Comida', description: 'Un clásico mexicano para empezar con energía.' },
  { id: 'food_elote', name: 'Elote callejero', emoji: '🌽', price: 150, category: 'Comida', description: 'El clásico de cualquier paseo.' },
  { id: 'food_chile', name: 'Chile picante', emoji: '🌶️', price: 350, category: 'Comida', description: 'Para quienes hablan sin miedo.' },
  { id: 'food_aguas', name: 'Aguas frescas', emoji: '🥤', price: 900, category: 'Comida', description: 'Refrescante y muy mexicano.' },
  { id: 'food_mole', name: 'Maestro del mole', emoji: '🍲', price: 2500, category: 'Comida', description: 'Un sabor digno de leyenda.' },
  // Animales
  { id: 'avatar_ajolote', name: 'Ajolote', emoji: '🦎', price: 35, category: 'Animales', description: 'Un compañero muy mexicano.' },
  { id: 'animal_xolo', name: 'Xoloitzcuintle', emoji: '🐕', price: 180, category: 'Animales', description: 'Guardián de espíritu mexicano.' },
  { id: 'animal_jaguar', name: 'Jaguar', emoji: '🐆', price: 750, category: 'Animales', description: 'Ágil, elegante y poderoso.' },
  { id: 'animal_eagle', name: 'Águila real', emoji: '🦅', price: 1800, category: 'Animales', description: 'Domina desde las alturas.' },
  { id: 'animal_quetzal', name: 'Quetzal', emoji: '🦜', price: 4500, category: 'Animales', description: 'Un tesoro de colores.' },
  // Cultura
  { id: 'avatar_mariachi', name: 'Mariachi', emoji: '🎺', price: 250, category: 'Cultura', description: 'Que nunca falte la música.' },
  { id: 'culture_catrina', name: 'Catrina', emoji: '💀', price: 600, category: 'Cultura', description: 'Elegancia para celebrar nuestras tradiciones.' },
  { id: 'culture_danza', name: 'Danza folklórica', emoji: '💃', price: 1200, category: 'Cultura', description: 'Color y tradición en cada paso.' },
  { id: 'culture_charro', name: 'Charro', emoji: '🤠', price: 3000, category: 'Cultura', description: 'Orgullo y tradición mexicana.' },
  { id: 'culture_calavera', name: 'Calavera de oro', emoji: '☠️', price: 4500, category: 'Cultura', description: 'Una pieza especial de colección.' },
  // Personajes
  { id: 'avatar_luchador', name: 'Luchador', emoji: '🤼', price: 500, category: 'Personajes', description: 'Aprende español con máscara y actitud.' },
  { id: 'character_chilango', name: 'Chilango', emoji: '🧢', price: 1000, category: 'Personajes', description: 'Siempre encuentra qué hacer en la ciudad.' },
  { id: 'character_explorer', name: 'Exploradora', emoji: '🧭', price: 2200, category: 'Personajes', description: 'Lista para recorrer todo México.' },
  { id: 'character_chef', name: 'Chef mexicano', emoji: '👨‍🍳', price: 4000, category: 'Personajes', description: 'Una leyenda entre los fogones.' },
  // Legendarios
  { id: 'legend_quetzalcoatl', name: 'Quetzalcóatl', emoji: '🐉', price: 4000, category: 'Legendarios', description: 'Una figura mítica para estudiantes expertos.' },
  { id: 'legend_sun', name: 'Sol azteca', emoji: '☀️', price: 4500, category: 'Legendarios', description: 'Brilla como una leyenda.' },
  { id: 'legend_gold', name: 'Máscara de oro', emoji: '🏆', price: 5000, category: 'Legendarios', description: 'La recompensa más exclusiva de la tienda.' },
];

const SHOP_CATEGORIES = ['Todos', 'Comida', 'Animales', 'Cultura', 'Personajes', 'Legendarios', 'Logros'];

const NEGATIVE_ACHIEVEMENTS = [
  { id: 'GUERO 😅', name: 'GUERO', emoji: '😅', translation: 'Blondie / fair-haired person', explanation: 'In Mexico, “güero” commonly describes someone with light hair or a light complexion. It can be affectionate or simply descriptive; context and tone matter.', requirement: 'Alcanza 3 errores en total', description: 'Todavía te falta barrio. ¡Sigue practicando!', descriptionTranslation: 'You still need to learn the ropes. Keep practicing!', color: '#FEF3C7', border: '#F59E0B', threshold: 3 },
  { id: 'MEXICA-NO! 🇲🇽', name: 'MEXICA-NO!', emoji: '🇲🇽', translation: 'Mexican… not quite!', explanation: 'A playful pun on “mexicano” and “no”: it jokes that you are not quite getting Mexican Spanish right yet. This is a made-up achievement name, not a standard expression.', requirement: 'Alcanza 10 errores en total', description: 'Ya llevas varios tropiezos. ¡No te rindas!', descriptionTranslation: 'You’ve made a few mistakes. Don’t give up!', color: '#DBEAFE', border: '#60A5FA', threshold: 10 },
  { id: 'GABACHO 🧢', name: 'GABACHO', emoji: '🧢', translation: 'American / gringo', explanation: 'Informal Mexican slang often used for a person from the United States. Depending on the speaker and situation, it can sound neutral, teasing, or dismissive.', requirement: 'Alcanza 15 errores en total', description: 'Ya te estás haciendo notar por tus tropiezos.', descriptionTranslation: 'Your mistakes are starting to stand out.', color: '#E0E7FF', border: '#6366F1', threshold: 15 },
  { id: 'TACO BELL 🌮', name: 'TACO BELL', emoji: '🌮', translation: 'Taco Bell (restaurant chain)', explanation: 'A joke referencing the US fast-food chain. The name plays on the contrast between a commercial version of Mexican-inspired food and the variety of real Mexican food.', requirement: 'Alcanza 20 errores en total', description: 'Confundes el auténtico sabor del español mexicano.', descriptionTranslation: 'You’re mixing up authentic Mexican Spanish.', color: '#FFEDD5', border: '#F97316', threshold: 20 },
  { id: 'POCHITO 🐤', name: 'POCHITO', emoji: '🐤', translation: 'Little pocho (playful nickname)', explanation: 'A playful, invented diminutive inspired by “pocho,” a term sometimes used for a Mexican or Mexican American who has adopted many English-language or US cultural habits. “Pochito” is not a standard dictionary form.', requirement: 'Alcanza 25 errores en total', description: 'Un paso más cerca de la leyenda de los errores.', descriptionTranslation: 'You’re one step closer to becoming a mistake-making legend.', color: '#FCE7F3', border: '#EC4899', threshold: 25 },
  { id: 'GRINGO 🌵', name: 'GRINGO', emoji: '🌵', translation: 'Foreigner / often an American', explanation: 'In Mexico, “gringo” commonly refers to a person from the United States, though usage varies. It can be neutral, friendly, or derogatory depending on context, tone, and relationship.', requirement: 'Alcanza 30 errores en total', description: 'El máximo nivel de despiste. ¡Ya eres toda una leyenda!', descriptionTranslation: 'The ultimate level of confusion. You’re a legend!', color: '#FEE2E2', border: '#EF4444', threshold: 30 },
];

type BadWordEntry = {
  term: string; meaning: string; english: string; example: string; exampleEnglish: string; note: string;
  level: 'Fuerte' | 'Muy fuerte' | 'Suave'; group: 'Chingar' | 'Insultos' | 'Exclamaciones' | 'Pedo y fiesta' | 'Otras expresiones';
};

const BAD_WORD_ENTRIES: BadWordEntry[] = [
  { term: 'Chingar', meaning: 'Verbo comodín: molestar, fastidiar, trabajar duro, arruinar algo o tener sexo, según el contexto.', english: 'to mess with / bother / work very hard / screw', example: 'Me chingué todo el día trabajando.', exampleEnglish: 'I spent the whole day working my ass off.', note: 'Tiene muchos sentidos. El contexto y el tono lo cambian todo.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chinga', meaning: 'Una friega, un trabajo agotador o una golpiza.', english: 'a rough time / a beating / exhausting work', example: 'Qué chinga fue mudarnos ayer.', exampleEnglish: 'Moving yesterday was exhausting.', note: 'También se usa en “dar una chinga”.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chingadera', meaning: 'Objeto cuyo nombre no recuerdas, cosa de mala calidad o algo absurdo.', english: 'thingamajig / piece of crap / nonsense', example: '¿Me pasas esa chingadera de la mesa?', exampleEnglish: 'Can you pass me that thingy on the table?', note: 'El tono puede ser juguetón o despectivo.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chingonería', meaning: 'Algo extraordinario, muy bien hecho o impresionante.', english: 'something freaking awesome', example: '¡Tu cámara nueva es una chingonería!', exampleEnglish: 'Your new camera is freaking awesome!', note: 'Grosería positiva; expresa admiración.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chingón / chingona', meaning: 'Alguien muy hábil, bueno o impresionante; también puede sonar presumido.', english: 'badass / awesome / really skilled', example: 'Esa fotógrafa es bien chingona.', exampleEnglish: 'That photographer is really badass.', note: 'Entre amigos puede ser un elogio.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Un chingo', meaning: 'Muchísimo o una gran cantidad.', english: 'a ton / loads / a hell of a lot', example: 'Había un chingo de gente.', exampleEnglish: 'There were tons of people.', note: 'Muy común e informal.', level: 'Fuerte', group: 'Chingar' },
  { term: 'A chingarle', meaning: 'Ponerse a trabajar o esforzarse.', english: 'get to work / get cracking', example: 'Ya se hizo tarde; ¡a chingarle!', exampleEnglish: 'It’s getting late; let’s get to work!', note: 'Vulgar, pero puede sonar motivador entre conocidos.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chinga tu madre', meaning: 'Insulto muy agresivo dirigido a la madre de alguien.', english: 'extremely offensive insult', example: 'No se enseña como frase para usar: es una agresión verbal.', exampleEnglish: 'This is not taught as a phrase to use: it is a verbal attack.', note: 'Evítala. Puede provocar una pelea.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Hijo de la chingada', meaning: 'Insulto fuerte; también expresa frustración ante una situación difícil.', english: 'son of a bitch / damn', example: '¡Hijo de la chingada, se me olvidaron las llaves!', exampleEnglish: 'Damn it, I forgot my keys!', note: 'Puede dirigirse a una persona o usarse como exclamación.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Vete a la chingada', meaning: 'Rechazar o correr a alguien con mucho enojo.', english: 'get the hell out / go to hell', example: 'Después de la discusión le dijo que se fuera a la chingada.', exampleEnglish: 'After the argument, he told them to go to hell.', note: 'Hostil; no es una despedida amistosa.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Estar de la chingada', meaning: 'Estar pésimo, en muy mal estado o ser insoportable.', english: 'to be awful / to suck', example: 'El tráfico está de la chingada.', exampleEnglish: 'Traffic is fucking awful.', note: 'Se usa mucho para situaciones y cosas.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Deja de estar chingando', meaning: 'Deja de molestar o fastidiar.', english: 'stop bothering me / quit messing around', example: 'Estoy trabajando; deja de estar chingando.', exampleEnglish: 'I’m working; stop bothering me.', note: 'Suena brusco y molesto.', level: 'Fuerte', group: 'Chingar' },
  { term: 'A la chingada', meaning: 'Expresión para abandonar algo, mandarlo lejos o expresar hartazgo.', english: 'to hell with it', example: 'Ya no sirve; ¡a la chingada!', exampleEnglish: 'It doesn’t work anymore; to hell with it!', note: 'Muy dependiente del tono.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Me vale madre', meaning: 'No me importa absolutamente nada.', english: 'I don’t give a damn', example: 'Me vale madre lo que opinen.', exampleEnglish: 'I don’t give a damn what they think.', note: 'Muy descortés en contextos formales.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Pendejo / pendeja', meaning: 'Persona tonta, ingenua o que actuó sin pensar.', english: 'idiot / dumbass', example: 'Fui un pendejo por dejar las llaves dentro.', exampleEnglish: 'I was an idiot for leaving the keys inside.', note: 'Insulto común, pero puede herir o iniciar una discusión.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Cabrón / cabrona', meaning: 'Puede ser insulto, elogio por habilidad o trato de confianza entre amigos.', english: 'bastard / badass / dude', example: '¡Qué cabrón eres para bailar!', exampleEnglish: 'You’re really damn good at dancing!', note: 'La relación y entonación son decisivas.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Culero / culera', meaning: 'Persona cruel, cobarde, abusiva o de mala fe.', english: 'asshole / nasty person', example: 'Fue muy culero que no avisara.', exampleEnglish: 'It was really shitty of them not to let us know.', note: 'Despectivo; úsalo con cuidado.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Ojete', meaning: 'Persona mezquina, abusiva o desagradable.', english: 'jerk / asshole', example: 'No seas ojete y comparte.', exampleEnglish: 'Don’t be an asshole; share.', note: 'Insulto fuerte, aunque coloquial.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Pinche', meaning: 'Prefijo que intensifica desprecio, enojo o frustración.', english: 'damn / freaking', example: 'Este pinche teléfono no prende.', exampleEnglish: 'This damn phone won’t turn on.', note: 'Puede ser leve entre amigos o agresivo según el tono.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Pinchurriento', meaning: 'Algo miserable, insignificante o de muy mala calidad.', english: 'crappy / lousy', example: 'Me vendieron un cable pinchurriento.', exampleEnglish: 'They sold me a really crappy cable.', note: 'Despectivo y coloquial.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Mamón / mamona', meaning: 'Persona presumida, antipática o que se comporta con superioridad.', english: 'stuck-up / obnoxious', example: 'No seas mamón, ven con nosotros.', exampleEnglish: 'Don’t be a jerk; come with us.', note: 'Entre amigos puede ser una llamada de atención juguetona.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Baboso / babosa', meaning: 'Tonto, distraído o ingenuo.', english: 'fool / dummy', example: '¡Qué baboso, olvidé mi cartera!', exampleEnglish: 'What an idiot—I forgot my wallet!', note: 'A menudo es menos agresivo que “pendejo”.', level: 'Suave', group: 'Insultos' },
  { term: 'Lelo / lela', meaning: 'Alguien distraído, pasmado o lento para reaccionar.', english: 'blank / dazed / clueless', example: 'Se quedó lelo viendo el partido.', exampleEnglish: 'He sat there dazed, watching the game.', note: 'Más ligero y menos vulgar.', level: 'Suave', group: 'Insultos' },
  { term: 'Zopenco', meaning: 'Persona torpe o poco lista.', english: 'blockhead / fool', example: 'No seas zopenco: lee las instrucciones.', exampleEnglish: 'Don’t be a blockhead; read the instructions.', note: 'Suena algo anticuado y menos vulgar.', level: 'Suave', group: 'Insultos' },
  { term: 'Tarugo / taruga', meaning: 'Persona torpe o que no entiende algo.', english: 'dummy / blockhead', example: 'Ando bien tarugo hoy.', exampleEnglish: 'I’m being a bit of a dummy today.', note: 'Informal; puede ser burlón.', level: 'Suave', group: 'Insultos' },
  { term: 'Codo / coda', meaning: 'Persona tacaña que evita gastar o compartir.', english: 'cheap / stingy', example: 'No seas codo, invita unos tacos.', exampleEnglish: 'Don’t be so cheap; buy us some tacos.', note: 'No es una grosería fuerte.', level: 'Suave', group: 'Insultos' },
  { term: 'Naco / naca', meaning: 'Término clasista usado para llamar a alguien de mal gusto o poca educación.', english: 'tacky (classist insult)', example: 'Se registra para entenderlo, no para recomendar su uso.', exampleEnglish: 'Included so learners can recognize it, not as a recommendation to use it.', note: 'Puede ser clasista y discriminatorio. Evita usarlo para juzgar a personas.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Güey / wey', meaning: 'Forma muy común de decir “tipo”, “amigo” o “persona”; también puede ser insulto.', english: 'dude / guy / idiot', example: '¿Qué onda, güey? ¿Cómo estás?', exampleEnglish: 'What’s up, dude? How are you?', note: 'Entre amigos es cotidiano; con desconocidos puede sonar irrespetuoso.', level: 'Suave', group: 'Insultos' },
  { term: 'No mames', meaning: 'Sorpresa, incredulidad, molestia o admiración.', english: 'no way / you’ve got to be kidding', example: '¡No mames! ¿Ganaste la rifa?', exampleEnglish: 'No way! Did you win the raffle?', note: 'Muy común e informal; evita usarla en ambientes formales.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'No manches', meaning: 'Versión más suave de “no mames”.', english: 'no way / come on', example: '¡No manches! Está increíble.', exampleEnglish: 'No way! That’s amazing.', note: 'Alternativa más segura y familiar.', level: 'Suave', group: 'Exclamaciones' },
  { term: '¡A la madre!', meaning: 'Expresa sorpresa, susto o impresión.', english: 'holy crap / wow', example: '¡A la madre! Qué tan alto está.', exampleEnglish: 'Holy crap! That’s so high.', note: 'Muy coloquial; la intensidad depende del tono.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: '¡Ah, cabrón!', meaning: 'Sorpresa, incredulidad o admiración.', english: 'whoa / damn!', example: '¡Ah, cabrón! No sabía que tocabas guitarra.', exampleEnglish: 'Whoa, seriously! I didn’t know you played guitar.', note: 'Puede ser amistoso o confrontativo.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'Puta madre', meaning: 'Exclamación de frustración, dolor o enojo.', english: 'for fuck’s sake / damn it', example: '¡Puta madre! Se ponchó la llanta.', exampleEnglish: 'Damn it! The tire went flat.', note: 'Vulgar; no es apropiada en situaciones formales.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Híjole', meaning: 'Sorpresa, preocupación, pena o frustración; es una alternativa suave.', english: 'oh boy / gee', example: 'Híjole, creo que llegué tarde.', exampleEnglish: 'Oh man, I think I’m late.', note: 'No es una grosería; es una exclamación muy útil.', level: 'Suave', group: 'Exclamaciones' },
  { term: 'Son mamadas', meaning: 'Califica algo como absurdo, injusto o ridículo.', english: 'that’s bullshit', example: 'Que cobren dos veces es una mamada.', exampleEnglish: 'Charging twice is bullshit.', note: 'Vulgar y confrontativo.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Qué poca madre', meaning: 'Crítica a una acción considerada abusiva, injusta o descarada.', english: 'that’s shameless / what a nerve', example: 'Qué poca madre que lo hayan dejado esperando.', exampleEnglish: 'How shitty of them to leave him waiting.', note: 'Fuerte; expresa indignación.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Vale madre', meaning: 'No sirve, no importa o está arruinado, según el contexto.', english: 'it’s worthless / it doesn’t matter', example: 'Con esta lluvia, el plan ya valió madre.', exampleEnglish: 'With this rain, the plan is completely screwed.', note: 'Vulgar y muy frecuente.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Valer verga', meaning: 'Fracasar, salir muy mal o no importar.', english: 'to suck / to be screwed', example: 'Mi celular ya vale verga: no enciende.', exampleEnglish: 'My phone is fucked; it won’t turn on.', note: 'Muy vulgar.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Está de huevos', meaning: 'Algo está excelente o es impresionante.', english: 'it’s fucking awesome', example: 'La comida de ese lugar está de huevos.', exampleEnglish: 'The food at that place is fucking great.', note: 'Vulgar, pero positivo en muchos contextos.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'Está bien verga', meaning: 'Algo o alguien es muy bueno, impresionante o hábil.', english: 'really badass / freaking great', example: 'Ese truco está bien verga.', exampleEnglish: 'That trick is badass.', note: 'Vulgar y presumido según el tono.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Verga', meaning: 'Vulgarismo para pene; también aparece en muchas expresiones.', english: 'dick / cock', example: 'La palabra aparece en expresiones como “valer verga”.', exampleEnglish: 'The word appears in expressions such as “valer verga” (to be screwed).', note: 'Muy vulgar; evita usarla con desconocidos.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'A vergazos', meaning: 'A golpes o mediante una pelea física.', english: 'with punches / by fighting', example: 'No arreglen el problema a vergazos.', exampleEnglish: 'Don’t try to solve the problem by beating each other up.', note: 'Alude a violencia física.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Culo', meaning: 'Trasero; en expresiones como “ser culo”, cobarde.', english: 'ass / coward (in some phrases)', example: 'No seas culo, atrévete a preguntar.', exampleEnglish: 'Don’t be a chicken; dare to ask.', note: 'Vulgar; el significado depende de la frase.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'Coger', meaning: 'En México suele significar tener relaciones sexuales; en otros países puede significar simplemente tomar o agarrar.', english: 'to have sex (Mexico) / to take or grab (elsewhere)', example: 'En México, “coger” puede tener una connotación sexual muy directa.', exampleEnglish: 'In Mexico, “coger” can have a very direct sexual meaning.', note: 'Falso amigo importante para visitantes; usa “tomar” o “agarrar” si quieres decir grab.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'Pedo', meaning: 'Puede significar flatulencia, problema, asunto, borrachera o situación.', english: 'fart / problem / deal / drunkenness', example: '¿Qué pedo? = What’s up? / ¿Cuál es el pedo? = What’s the issue?', exampleEnglish: '“¿Qué pedo?” = “What’s up?” / “¿Cuál es el pedo?” = “What’s the issue?”', note: 'La expresión completa determina el significado.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: '¿Qué pedo?', meaning: 'Saludo informal o pregunta sobre qué está pasando.', english: 'what’s up? / what’s going on?', example: '¿Qué pedo, güey? ¿Todo bien?', exampleEnglish: 'What’s up, dude? Everything good?', note: 'Muy informal; no la uses en entrevistas o con autoridad.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'No hay pedo', meaning: 'No hay problema; está bien.', english: 'no problem / it’s all good', example: 'No hay pedo, yo te espero.', exampleEnglish: 'No problem, I’ll wait for you.', note: 'Informal; alternativa neutra: “no hay problema”.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Hacerla de pedo', meaning: 'Armar una discusión, reclamar o causar problemas.', english: 'to make a fuss / kick up a stink', example: 'No la hagas de pedo por algo tan pequeño.', exampleEnglish: 'Don’t make a big deal out of something so small.', note: 'Puede sonar retador.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Estar pedo / peda', meaning: 'Estar borracho o bajo los efectos del alcohol.', english: 'to be drunk', example: 'Ayer se puso bien pedo en la fiesta.', exampleEnglish: 'He got really drunk at the party yesterday.', note: '“Peda” también puede referirse a una fiesta con alcohol.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'La peda', meaning: 'Fiesta o reunión donde se bebe alcohol.', english: 'drinking party / booze-up', example: '¿Vas a caerle a la peda el sábado?', exampleEnglish: 'Are you coming to the party on Saturday?', note: 'Muy coloquial.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Crudo / cruda', meaning: 'Tener resaca después de beber.', english: 'hungover', example: 'Estoy bien crudo; necesito agua y descansar.', exampleEnglish: 'I’m really hungover; I need water and rest.', note: '“Cruda” también nombra la resaca.', level: 'Suave', group: 'Pedo y fiesta' },
  { term: 'Echar desmadre', meaning: 'Divertirse haciendo mucho ruido o causando caos.', english: 'to party / raise hell / make a mess', example: 'Fuimos al concierto a echar desmadre.', exampleEnglish: 'We went to the concert to party and go wild.', note: 'Puede ser diversión o desorden, según el contexto.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Desmadre', meaning: 'Caos, desorden, fiesta intensa o situación complicada.', english: 'mess / chaos / wild party', example: 'Se hizo un desmadre en la salida.', exampleEnglish: 'There was chaos at the exit.', note: 'Una de las palabras más versátiles del habla informal.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Pacheco / pacheca', meaning: 'Estar bajo los efectos de la marihuana.', english: 'high / stoned', example: 'En la película, el personaje está bien pacheco.', exampleEnglish: 'In the movie, the character is really high.', note: 'Referencia a cannabis; no implica aprobación de su consumo.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Echar cotorreo', meaning: 'Platicar, bromear y pasar el rato.', english: 'to chat / hang out and joke around', example: 'Vamos por un café a echar cotorreo.', exampleEnglish: 'Let’s grab a coffee and shoot the breeze.', note: 'Bastante amistosa y menos vulgar.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Hacerse pendejo', meaning: 'Fingir que no se entiende o evitar una responsabilidad.', english: 'to play dumb / pretend not to know', example: 'No te hagas pendejo: sí viste el mensaje.', exampleEnglish: 'Don’t play dumb: you did see the message.', note: 'Vulgar y acusatorio.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Hacerse güey', meaning: 'Hacerse el distraído o fingir que no se sabe algo.', english: 'to play dumb / act clueless', example: 'Se hizo güey y no pagó la cuenta.', exampleEnglish: 'He played dumb and didn’t pay the bill.', note: 'Muy común y menos fuerte que “hacerse pendejo”.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Hacerse bolas', meaning: 'Confundirse o enredarse al explicar o resolver algo.', english: 'to get confused / get mixed up', example: 'Me hice bolas con las instrucciones.', exampleEnglish: 'I got confused by the instructions.', note: 'No es una grosería; es una expresión cotidiana.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Pagar los platos rotos', meaning: 'Sufrir las consecuencias de un error que cometió otra persona.', english: 'to take the blame / pay for someone else’s mistake', example: 'Yo pagué los platos rotos por el retraso.', exampleEnglish: 'I took the blame for someone else’s delay.', note: 'Expresión idiomática, no vulgar.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Hacer de chivo los tamales', meaning: 'Engañar a alguien, especialmente a la pareja; expresión tradicional.', english: 'to cheat on someone / deceive', example: 'La frase se usa para hablar de una infidelidad.', exampleEnglish: 'The phrase is used to talk about infidelity.', note: 'Expresión regional y humorística; no todos la conocen.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Mandar al carajo', meaning: 'Rechazar a alguien o dejar de tolerar algo.', english: 'to tell someone to get lost / to hell with it', example: 'Mandó al carajo ese trabajo tóxico.', exampleEnglish: 'He told that toxic job to go to hell.', note: 'Grosero, pero menos fuerte que “mandar a la chingada”.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Ponerse las pilas', meaning: 'Activarse, concentrarse o empezar a esforzarse.', english: 'to get your act together / get moving', example: 'Ponte las pilas o vamos a llegar tarde.', exampleEnglish: 'Get your act together or we’ll be late.', note: 'No es grosería; es muy útil.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Me importa un carajo', meaning: 'No me importa en absoluto.', english: 'I don’t give a damn', example: 'Me importa un carajo lo que diga.', exampleEnglish: 'I don’t give a damn what they say.', note: 'Vulgar y desafiante.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Estar hasta la madre', meaning: 'Estar harto, saturado o en un lugar lleno.', english: 'to be fed up / packed to the brim', example: 'Estoy hasta la madre de este ruido.', exampleEnglish: 'I’m fed up with this noise.', note: 'Muy vulgar; el contexto cambia el sentido.', level: 'Muy fuerte', group: 'Otras expresiones' },
  { term: 'Dar en la madre', meaning: 'Golpear, dañar o arruinar algo.', english: 'to beat up / wreck / mess up', example: 'Se me cayó y le di en la madre al teléfono.', exampleEnglish: 'I dropped it and completely wrecked the phone.', note: 'Vulgar; puede referirse a daño físico o material.', level: 'Muy fuerte', group: 'Otras expresiones' },
  { term: 'A huevo', meaning: 'Sí, claro o por supuesto; también puede significar que algo se hace a la fuerza.', english: 'hell yeah / absolutely / by force', example: '¿Vienes con nosotros? —¡A huevo!', exampleEnglish: 'Are you coming with us? — Hell yeah!', note: 'Muy coloquial; evita confundirlo con un sí formal.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'De huevos', meaning: 'Excelente, genial o muy bueno.', english: 'awesome / freaking great', example: 'La película estuvo de huevos.', exampleEnglish: 'The movie was freaking awesome.', note: 'Vulgar aunque positivo.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Valemadrismo', meaning: 'Actitud de indiferencia total o despreocupación.', english: 'not-giving-a-damn attitude', example: 'Su valemadrismo desespera al equipo.', exampleEnglish: 'His don’t-care attitude drives the team crazy.', note: 'Sustantivo coloquial derivado de “valer madre”.', level: 'Muy fuerte', group: 'Otras expresiones' },
  { term: 'Puto / puta', meaning: 'Insulto sexualizado; “puto” también se ha usado como insulto homofóbico.', english: 'whore / f-word (often homophobic when aimed at men)', example: 'Se incluye para reconocerlo en películas o conversaciones, no para insultar.', exampleEnglish: 'Included so learners can recognize it in films or conversations, not to insult anyone.', note: 'Puede ser misógino u homofóbico. Evita usarlo para referirte a personas.', level: 'Muy fuerte', group: 'Insultos' },
  { term: 'Maricón', meaning: 'Insulto homofóbico usado para denigrar a hombres o cuestionar su masculinidad.', english: 'homophobic slur', example: 'Aprende a reconocerlo, pero no lo uses para dirigirte a alguien.', exampleEnglish: 'Learn to recognize it, but don’t use it to address someone.', note: 'Es un insulto discriminatorio; no es una forma inocente de decir “cobarde”.', level: 'Muy fuerte', group: 'Insultos' },
  { term: 'Joto', meaning: 'Insulto homofóbico que se usa contra hombres gay o para burlarse de alguien.', english: 'homophobic slur', example: 'Se explica por comprensión cultural; no se recomienda repetirlo.', exampleEnglish: 'Explained for cultural understanding; it is not recommended to repeat it.', note: 'Ofensivo y discriminatorio.', level: 'Muy fuerte', group: 'Insultos' },
  { term: 'Mierda', meaning: 'Excremento; también describe algo pésimo o una situación frustrante.', english: 'shit / crap', example: '¡Qué mierda de servicio!', exampleEnglish: 'What shitty service!', note: 'Vulgar en casi todos los contextos.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'De la fregada', meaning: 'Muy mal, pésimo o desagradable; versión más suave de “de la chingada”.', english: 'awful / really bad', example: 'El clima está de la fregada.', exampleEnglish: 'The weather is awful.', note: 'Buena alternativa si quieres evitar una grosería más fuerte.', level: 'Suave', group: 'Otras expresiones' },
  { term: '¡Qué poca!', meaning: 'Reproche por una acción abusiva, descarada o injusta.', english: 'that’s outrageous / what a nerve', example: '¡Qué poca! Ni siquiera avisaron que cancelaban.', exampleEnglish: 'How rude! They didn’t even tell us they were cancelling.', note: 'Versión abreviada y menos explícita de “qué poca madre”.', level: 'Suave', group: 'Exclamaciones' },
  { term: 'Chale', meaning: 'Expresa decepción, resignación o sorpresa desagradable.', english: 'damn / bummer / oh well', example: 'Chale, ya se acabaron los tacos.', exampleEnglish: 'Darn, the tacos are already gone.', note: 'Muy común y relativamente suave.', level: 'Suave', group: 'Exclamaciones' },
  { term: 'Está cañón', meaning: 'Algo es difícil, intenso o impresionante.', english: 'that’s tough / intense / wild', example: 'Está cañón aprender tantos modismos.', exampleEnglish: 'Learning so many idioms is really tough.', note: 'No es grosería y se usa muchísimo.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Está cabrón', meaning: 'Algo es muy difícil, impresionante o complicado.', english: 'that’s tough / badass / intense', example: 'Está cabrón manejar en hora pico.', exampleEnglish: 'Driving in rush hour is really hard.', note: 'Más fuerte que “está cañón”; el sentido depende del tono.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Ni madres', meaning: 'Negación tajante: de ninguna manera o absolutamente nada.', english: 'hell no / absolutely nothing', example: '¿Vas a prestarle tu coche? —¡Ni madres!', exampleEnglish: 'Are you going to lend him your car? — No fucking way!', note: 'Muy vulgar y tajante.', level: 'Muy fuerte', group: 'Exclamaciones' },
  { term: 'Ahorita no, joven', meaning: 'Respuesta informal para rechazar o posponer algo; a veces se dice con ironía.', english: 'not right now, buddy', example: 'Ahorita no, joven; estoy ocupado.', exampleEnglish: 'Not right now, young man; I’m busy.', note: 'No es grosería, pero puede sonar sarcástica.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Chale, qué pedo', meaning: 'Mezcla de decepción y desconcierto ante algo inesperado.', english: 'damn, what the hell?', example: 'Chale, ¿qué pedo con este tráfico?', exampleEnglish: 'Damn, what’s with this traffic?', note: 'Muy informal.', level: 'Fuerte', group: 'Exclamaciones' },
  { term: 'No te pases de lanza', meaning: 'No abuses, no exageres o no cruces el límite.', english: 'don’t push it / don’t go too far', example: 'No te pases de lanza, esa era mi última rebanada.', exampleEnglish: 'Don’t be such a jerk; that was my last slice.', note: 'Informal y bastante útil.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Pasarse de verga', meaning: 'Excederse de manera abusiva, cruel o descarada.', english: 'to go way too far / be a total jerk', example: 'Se pasó de verga al cobrarles de más.', exampleEnglish: 'He really crossed the line by overcharging them.', note: 'Muy vulgar.', level: 'Muy fuerte', group: 'Otras expresiones' },
  { term: 'Hacer un despapaye', meaning: 'Hacer un desorden o causar caos.', english: 'to make a mess / cause chaos', example: 'Los niños hicieron un despapaye en la sala.', exampleEnglish: 'The kids made a huge mess in the living room.', note: 'Más suave que “hacer un desmadre”.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Estar de poca madre', meaning: 'Ser excelente o muy agradable.', english: 'to be freaking great', example: 'La vista desde aquí está de poca madre.', exampleEnglish: 'The view from here is freaking amazing.', note: 'Expresión positiva pero vulgar.', level: 'Muy fuerte', group: 'Otras expresiones' },
  { term: 'A toda madre', meaning: 'Muy bueno, agradable o excelente.', english: 'awesome / really great', example: 'La pasamos a toda madre.', exampleEnglish: 'We had an absolutely great time.', note: 'Vulgar, pero generalmente positivo.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Dar el avión', meaning: 'Fingir que escuchas o prestar atención sin hacerlo realmente.', english: 'to humor someone / pretend to listen', example: 'Le di el avión porque repetía lo mismo.', exampleEnglish: 'I just humored him because he kept repeating himself.', note: 'No es grosería; modismo muy mexicano.', level: 'Suave', group: 'Otras expresiones' },
  { term: 'Echar la hueva', meaning: 'No hacer nada, descansar o estar sin ganas de trabajar.', english: 'to laze around / do nothing', example: 'El domingo me quedé echando la hueva.', exampleEnglish: 'I spent Sunday doing absolutely nothing.', note: 'Vulgar informal, pero común.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Huevón / huevona', meaning: 'Persona floja o perezosa.', english: 'lazybones / lazy person', example: 'No seas huevón y ayúdame a mover la mesa.', exampleEnglish: 'Don’t be lazy; help me move the table.', note: 'Puede ser insulto o broma entre amigos.', level: 'Fuerte', group: 'Insultos' },
  { term: 'Hueva', meaning: 'Pereza, flojera o falta de ganas.', english: 'laziness / can’t be bothered', example: 'Me da hueva salir con esta lluvia.', exampleEnglish: 'I can’t be bothered to go out in this rain.', note: 'Muy común; menos agresiva que otras groserías.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Me da culo', meaning: 'Me da miedo o me intimida algo.', english: 'it freaks me out / I’m scared', example: 'Me da culo manejar de noche.', exampleEnglish: 'I’m scared to drive at night.', note: 'Muy coloquial y vulgar.', level: 'Fuerte', group: 'Otras expresiones' },
  { term: 'Está de la verga', meaning: 'Algo está horrible o en muy mal estado.', english: 'it’s fucking awful', example: 'El servicio estuvo de la verga.', exampleEnglish: 'The service was fucking terrible.', note: 'Muy vulgar.', level: 'Muy fuerte', group: 'Otras expresiones' },
  { term: 'Chingadazo', meaning: 'Golpe fuerte o caída aparatosa.', english: 'a hard hit / a nasty fall', example: 'Se dio un chingadazo con la puerta.', exampleEnglish: 'He slammed into the door.', note: 'Vulgar; puede aludir a violencia o accidente.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chingarse', meaning: 'Aguantarse algo, esforzarse mucho, dañarse o aprovecharse de alguien, según la construcción.', english: 'to put up with / work hard / get screwed', example: 'Me tuve que chingar dos horas de tráfico.', exampleEnglish: 'I had to endure two hours of traffic.', note: 'Verbo con varios sentidos; no traducir palabra por palabra.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Chingado / chingada', meaning: 'Adjetivo o exclamación para expresar enojo, frustración o intensidad.', english: 'damn / freaking', example: '¿Dónde chingados dejé el teléfono?', exampleEnglish: 'Where the hell did I leave my phone?', note: 'Muy informal y vulgar.', level: 'Fuerte', group: 'Chingar' },
  { term: 'A chingar a su madre', meaning: 'Expresión extremadamente agresiva para echar a alguien.', english: 'go fuck yourself / get the hell out', example: 'Se estudia para reconocer la agresión, no para usarla.', exampleEnglish: 'Studied so learners can recognize the aggressive phrase, not use it.', note: 'Muy ofensiva; puede escalar un conflicto.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Chingado sea', meaning: 'Exclamación de frustración.', english: 'damn it', example: '¡Chingado sea! Se fue la luz.', exampleEnglish: 'Damn it! The power went out.', note: 'Vulgar, pero menos directa que un insulto personal.', level: 'Fuerte', group: 'Chingar' },
  { term: 'Me lleva la…', meaning: 'Exclamación incompleta o suavizada para expresar frustración sin decir el insulto completo.', english: 'for crying out loud / damn it', example: '¡Me lleva la…! Otra vez se descompuso.', exampleEnglish: 'For crying out loud! It broke down again.', note: 'A euphemistic fragment; the listener often understands the omitted vulgar ending.', level: 'Suave', group: 'Exclamaciones' },
  { term: 'Qué poca madre', meaning: 'Reproche fuerte ante algo considerado injusto, abusivo o descarado.', english: 'that’s outrageous / what a nerve', example: 'Qué poca madre que le cobraran dos veces.', exampleEnglish: 'It’s outrageous that they charged him twice.', note: 'Puede expresar indignación; no es un elogio.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Estar hasta la madre', meaning: 'Estar harto, saturado o muy molesto con algo.', english: 'to be fed up / sick and tired', example: 'Estoy hasta la madre del ruido.', exampleEnglish: 'I’m sick and tired of the noise.', note: 'Muy vulgar. Describe hartazgo, no necesariamente una amenaza.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Valer madre', meaning: 'No tener importancia o salir muy mal, según el contexto.', english: 'to not matter a damn / to be screwed', example: 'Si no guardamos el archivo, va a valer madre el trabajo.', exampleEnglish: 'If we don’t save the file, all the work will be screwed.', note: 'El significado cambia con la construcción; aprende a reconocerlo antes de usarlo.', level: 'Muy fuerte', group: 'Chingar' },
  { term: 'Qué pedo con…', meaning: 'Pregunta informal para expresar sorpresa, confusión o crítica sobre algo.', english: 'what’s up with…? / what the hell is going on with…?', example: '¿Qué pedo con el tráfico hoy?', exampleEnglish: 'What the hell is up with traffic today?', note: 'Muy informal y vulgar. Evítala en situaciones profesionales o con desconocidos.', level: 'Fuerte', group: 'Pedo y fiesta' },
  { term: 'Andar de malas', meaning: 'Estar de mal humor.', english: 'to be in a bad mood', example: 'Hoy anda de malas; mejor hablamos después.', exampleEnglish: 'He’s in a bad mood today; let’s talk later.', note: 'No es una grosería, pero es una expresión cotidiana que suele aparecer junto al lenguaje fuerte.', level: 'Suave', group: 'Otras expresiones' },

];

export default function Index() {
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [coins, setCoins] = useState(0);
  const [coinsLoaded, setCoinsLoaded] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [shopLoaded, setShopLoaded] = useState(false);
  const [selectedShopCategory, setSelectedShopCategory] = useState('Todos');
  const [ownedShopItems, setOwnedShopItems] = useState<string[]>(['avatar_default']);
  const [equippedAvatar, setEquippedAvatar] = useState('avatar_default');
  const level = Math.floor(xp / 100) + 1;

  function showMexicanFeedback(isCorrect: boolean) {
    const positiveMessages = [
      'Te crees muy salsa 😎', 'Ahí la llevas 🔥', '¡Te sientes un chingo!',
      'No estás tan wey 😂', '¡Ah, cabrón! 👀', '¡Míralooo! 😏',
      'Y yo que creía que no sabías ni madres…', '¡Qué chingón! 🇲🇽',
      'Vas bien, mi chingón 💪',
    ];
    const challengeMessages = [
      'Ah, tas bien wey 😅', 'Creo que un niño podría hacerlo mejor que tú 😂',
      '¿Has considerado dedicarte a otra cosa? 🤔', 'Ya no estás tan cabrón…',
      'Puro pájaro hablador 🐦', '¡No sabes ni madres! A darle otra vez.',
    ];

    if (isCorrect) {
      setMistakeStreak(0);
    } else {
      const nextStreak = mistakeStreak + 1;
      const nextTotal = totalMistakes + 1;
      setMistakeStreak(nextStreak);
      setTotalMistakes(nextTotal);
      setCoins((previous) => previous - nextStreak);
      const newlyUnlocked = NEGATIVE_ACHIEVEMENTS.find(
        (achievement) => nextTotal >= achievement.threshold && !negativeAchievements.includes(achievement.id)
      );
      if (newlyUnlocked) {
        const updated = [...negativeAchievements, newlyUnlocked.id];
        setNegativeAchievements(updated);
        AsyncStorage.setItem('mexicanSlangNegativeAchievements', JSON.stringify(updated)).catch(() => { });
        setMexicanFeedbackMessage(`Logro negativo desbloqueado: ${newlyUnlocked.name}`);
        setFeedbackModalVisible(true);
        return;
      }
    }

    // Popup ocasional: evita interrumpir cada respuesta.
    if (Math.random() > 0.72) {
      setMexicanFeedbackMessage('');
      setFeedbackModalVisible(false);
      return;
    }
    const messages = isCorrect ? positiveMessages : challengeMessages;
    setMexicanFeedbackMessage(messages[Math.floor(Math.random() * messages.length)]);
    setFeedbackModalVisible(true);
  }

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
  const [mexicanFeedbackMessage, setMexicanFeedbackMessage] = useState('');
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [mistakeStreak, setMistakeStreak] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [totalMistakesLoaded, setTotalMistakesLoaded] = useState(false);
  const [negativeAchievements, setNegativeAchievements] = useState<string[]>([]);
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
  type InteractiveLevel = InteractivePracticeLevel;
  const [interactiveLevel, setInteractiveLevel] = useState<InteractiveLevel | null>(null);
  const levels: InteractiveLevel[] = [
    'beginner',
    'intermediate',
    'advanced',
  ];
  const [interactiveIndex, setInteractiveIndex] = useState(0);
  const [interactiveAnswer, setInteractiveAnswer] = useState('');
  const [interactiveBlankAnswer, setInteractiveBlankAnswer] = useState('');
  const [interactiveOrderedWords, setInteractiveOrderedWords] = useState<string[]>([]);
  const [interactiveCorrectCount, setInteractiveCorrectCount] = useState(0);
  const [interactiveAnswered, setInteractiveAnswered] = useState(false);
  const [interactiveSessionXp, setInteractiveSessionXp] = useState(0);
  const [interactiveProgress, setInteractiveProgress] = useState<InteractiveProgress>(EMPTY_INTERACTIVE_PROGRESS);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [learnerLevel, setLearnerLevel] = useState('beginner');
  const [learnerGoal, setLearnerGoal] = useState('travel');
  const [learnerInterest, setLearnerInterest] = useState('food');
  const [badWordSearch, setBadWordSearch] = useState('');
  const [badWordGroup, setBadWordGroup] = useState('Todas');
  const { category } = useLocalSearchParams<{ category?: string }>();
  const router = useRouter();
  const rewardClaimed = useRef(false);

  useEffect(() => {
    const loadInteractiveProgress = async () => {
      try {
        const saved = await AsyncStorage.getItem(INTERACTIVE_PROGRESS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<InteractiveProgress>;
          setInteractiveProgress({
            ...EMPTY_INTERACTIVE_PROGRESS,
            ...parsed,
            byLevel: { ...EMPTY_INTERACTIVE_PROGRESS.byLevel, ...(parsed.byLevel ?? {}) },
            mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
            completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
          });
        }
      } catch (error) {
        console.log('Error loading interactive practice progress:', error);
      }
    };
    loadInteractiveProgress();
  }, []);

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

  useEffect(() => {
    const loadCoins = async () => {
      try {
        const savedCoins = await AsyncStorage.getItem('mexicanSlangCoins');
        setCoins(Number(savedCoins ?? 0));
      } catch (error) {
        console.log('Error al cargar monedas:', error);
      } finally {
        setCoinsLoaded(true);
      }
    };
    loadCoins();
  }, []);

  useEffect(() => {
    if (!coinsLoaded) return;
    AsyncStorage.setItem('mexicanSlangCoins', String(coins)).catch((error) => {
      console.log('Error al guardar monedas:', error);
    });
  }, [coins, coinsLoaded]);

  useEffect(() => {
    const loadShop = async () => {
      try {
        const savedOwned = await AsyncStorage.getItem('mexicanSlangShopOwned');
        const savedAvatar = await AsyncStorage.getItem('mexicanSlangEquippedAvatar');
        if (savedOwned) setOwnedShopItems(JSON.parse(savedOwned));
        if (savedAvatar) setEquippedAvatar(savedAvatar);
      } catch (error) {
        console.log('Error al cargar la tienda:', error);
      } finally {
        setShopLoaded(true);
      }
    };
    loadShop();
  }, []);

  useEffect(() => {
    if (!shopLoaded) return;
    AsyncStorage.setItem('mexicanSlangShopOwned', JSON.stringify(ownedShopItems)).catch((error) => {
      console.log('Error al guardar artículos de la tienda:', error);
    });
  }, [ownedShopItems]);

  useEffect(() => {
    if (!shopLoaded) return;
    AsyncStorage.setItem('mexicanSlangEquippedAvatar', equippedAvatar).catch((error) => {
      console.log('Error al guardar el avatar:', error);
    });
  }, [equippedAvatar]);

  function buyOrEquipAvatar(item: typeof SHOP_AVATARS[number]) {
    if (ownedShopItems.includes(item.id)) {
      setEquippedAvatar(item.id);
      return;
    }
    if (coins < item.price) return;
    setCoins((previous) => previous - item.price);
    setOwnedShopItems((previous) => [...previous, item.id]);
    setEquippedAvatar(item.id);
  }

  function earnCoins(amount: number) {
    setCoins((previous) => previous + amount);
  }



  useEffect(() => {
    AsyncStorage.getItem('mexicanSlangNegativeAchievements').then((saved) => {
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        const aliases: Record<string, string> = {
          'GUERO': 'GUERO 😅',
          'MEXICA-NO!': 'MEXICA-NO! 🇲🇽',
          'GABACHO': 'GABACHO 🧢',
          'TACO BELL': 'TACO BELL 🌮',
          'POCHITO': 'POCHITO 🐤',
          'GRINGO': 'GRINGO 🌵',
          'GRINGO 🤠': 'GRINGO 🌵',
        };
        const validIds = new Set(NEGATIVE_ACHIEVEMENTS.map((item) => item.id));
        const migrated = Array.from(new Set(parsed.map((id) => aliases[id] || id).filter((id) => validIds.has(id))));
        setNegativeAchievements(migrated);
        if (JSON.stringify(parsed) !== JSON.stringify(migrated)) {
          AsyncStorage.setItem('mexicanSlangNegativeAchievements', JSON.stringify(migrated)).catch(() => { });
        }
      }
    }).catch(() => { });
    AsyncStorage.getItem('mexicanSlangTotalMistakes').then((saved) => {
      if (saved) setTotalMistakes(Number(saved) || 0);
      setTotalMistakesLoaded(true);
    }).catch(() => setTotalMistakesLoaded(true));
  }, []);

  useEffect(() => {
    if (!totalMistakesLoaded) return;
    AsyncStorage.setItem('mexicanSlangTotalMistakes', String(totalMistakes)).catch(() => { });
  }, [totalMistakes, totalMistakesLoaded]);


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
    showMexicanFeedback(option === question.correct);

    if (option === question.correct) {
      setScore((previous) => previous + 1);
      setXp((previous) => previous + 10);
      earnCoins(1);
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
    earnCoins(5);

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
        <ScrollView style={{ flex: 1, backgroundColor: '#F7F7F2' }} contentContainerStyle={styles.pageContent}>
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
        contentContainerStyle={styles.pageContent}
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
            alignSelf: 'flex-end',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 22,
            paddingVertical: 8,
            paddingHorizontal: 13,
            marginTop: 16,
          }}>
            <Image
              source={{ uri: 'https://www.banxico.org.mx/multimedia/C_mon_1.png' }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                marginRight: 8,
              }}
              resizeMode="contain"
              accessibilityLabel="Moneda mexicana real de un peso"
            />
            <Text style={{ color: '#14532D', fontWeight: '800', fontSize: 16 }}>{coins}</Text>
            <Text style={{ color: '#64748B', fontSize: 12, marginLeft: 5 }}>pesos</Text>
          </View>

          <Pressable
            onPress={() => setShopVisible(true)}
            style={{ alignSelf: 'flex-end', backgroundColor: '#FDE68A', borderRadius: 13, paddingVertical: 10, paddingHorizontal: 15, marginTop: 10, flexDirection: 'row', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 17, marginRight: 7 }}>🛍️</Text>
            <Text style={{ color: '#78350F', fontWeight: '800', fontSize: 13 }}>Tienda de recompensas</Text>
          </Pressable>

          <View style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', marginTop: 7 }}>
            <Text style={{ fontSize: 18, marginRight: 5 }}>{SHOP_AVATARS.find((item) => item.id === equippedAvatar)?.emoji ?? '🧑‍🎤'}</Text>
            <Text style={{ color: '#D1FAE5', fontSize: 11 }}>Tu avatar</Text>
          </View>

          <View style={{
            flexDirection: 'row',
            marginTop: 14,
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
            onPress={() => router.push({ pathname: '/', params: { category: 'badwords' } })}
            style={{ backgroundColor: '#7F1D1D', borderRadius: 20, padding: 20, marginBottom: 18 }}
          >
            <Text style={{ color: '#FECACA', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>NEW · MEXICAN STREET LANGUAGE</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 6 }}>🤬 Bad Words: las buenas groserías</Text>
            <Text style={{ color: '#FEE2E2', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              Aprende qué significan las groserías mexicanas, cómo cambian según el contexto y cuáles es mejor no repetir.
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14 }}>
              <Text style={{ color: '#7F1D1D', fontWeight: 'bold' }}>Explore bad words →</Text>
            </View>
          </Pressable>

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

          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#14532D', fontSize: 22, fontWeight: 'bold', marginBottom: 5 }}>
              Practice real-life situations
            </Text>
            <Text style={{ color: '#64748B', fontSize: 14, lineHeight: 20, marginBottom: 13 }}>
              Choose where you want to practice. Order food, get around, shop, and talk with locals.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[...freePracticeScenarios]
                .sort((a, b) => getScenarioPriority(a.id, learnerGoal, learnerInterest) - getScenarioPriority(b.id, learnerGoal, learnerInterest))
                .map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setFreeScenarioIndex(index);
                      setFreeTurnIndex(0);
                      setFreeResponse('');
                      setFreeSubmitted(false);
                      setFreeShowHint(false);
                      setFreeSessionXp(0);
                      router.push({ pathname: '/', params: { category: 'freeconversation' } });
                    }}
                    style={{
                      width: '48%',
                      flexGrow: 1,
                      minHeight: 104,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: '#D1FAE5',
                    }}
                  >
                    <Text style={{ fontSize: 25, marginBottom: 7 }}>{item.emoji}</Text>
                    <Text style={{ color: '#14532D', fontSize: 15, fontWeight: 'bold' }}>{item.title}</Text>
                    <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 4 }} numberOfLines={2}>{item.description}</Text>
                    <Text style={{ color: '#0F766E', fontSize: 12, fontWeight: 'bold', marginTop: 9 }}>Practice →</Text>
                  </Pressable>
                ))}
            </View>
          </View>




          <Pressable
            onPress={() => {
              setInteractiveLevel(level as unknown as InteractiveLevel);
              setInteractiveIndex(0);
              setInteractiveAnswer('');
              setInteractiveBlankAnswer('');
              setInteractiveOrderedWords([]);
              setInteractiveCorrectCount(0);
              setInteractiveAnswered(false);
              setInteractiveSessionXp(0);
              router.push({ pathname: '/', params: { category: 'interactivepractice' } });
            }}
            style={{ backgroundColor: '#6D28D9', borderRadius: 20, padding: 20, marginBottom: 18 }}
          >
            <Text style={{ color: '#EDE9FE', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>NEW · INTERACTIVE EXERCISES</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 6 }}>🎯 Interactive practice</Text>
            <Text style={{ color: '#F5F3FF', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              Practice with multiple choice, fill-in-the-blank, and sentence-building challenges.
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14 }}>
              <Text style={{ color: '#6D28D9', fontWeight: 'bold' }}>Start interactive practice →</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: '/', params: { category: 'culture' } })}
            style={{
              backgroundColor: '#7C2D12',
              borderRadius: 20,
              padding: 20,
              marginBottom: 18,
            }}
          >
            <Text style={{ color: '#FED7AA', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
              EXPLORE MEXICO BEYOND THE WORDS
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginTop: 6 }}>
              🇲🇽 Mexican Culture
            </Text>
            <Text style={{ color: '#FFEDD5', fontSize: 14, lineHeight: 21, marginTop: 6 }}>
              Discover slang, food expressions, social customs, and when a phrase feels friendly, formal, or too strong.
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14 }}>
              <Text style={{ color: '#9A3412', fontWeight: 'bold' }}>Explore culture →</Text>
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
        <Modal visible={shopVisible} animationType="slide" transparent onRequestClose={() => setShopVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#F8FAFC', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '88%', paddingTop: 20, paddingHorizontal: 18, paddingBottom: 28 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View>
                  <Text style={{ color: '#14532D', fontSize: 24, fontWeight: '900' }}>Tienda mexicana</Text>
                  <Text style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>Desbloquea avatares con tus monedas.</Text>
                </View>
                <Pressable onPress={() => setShopVisible(false)} style={{ backgroundColor: '#E2E8F0', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#334155', fontSize: 20, fontWeight: '700' }}>×</Text>
                </Pressable>
              </View>
              <View style={{ backgroundColor: '#DCFCE7', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                <Image source={{ uri: 'https://www.banxico.org.mx/multimedia/C_mon_1.png' }} style={{ width: 30, height: 30, marginRight: 9 }} resizeMode="contain" />
                <Text style={{ color: '#14532D', fontWeight: '800', fontSize: 16 }}>{coins} pesos disponibles</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }} contentContainerStyle={{ paddingVertical: 3, paddingRight: 6 }}>
                {SHOP_CATEGORIES.map((categoryName) => (
                  <Pressable key={categoryName} onPress={() => setSelectedShopCategory(categoryName)} style={{ paddingVertical: 9, paddingHorizontal: 14, borderRadius: 18, marginRight: 7, backgroundColor: selectedShopCategory === categoryName ? '#14532D' : '#E2E8F0' }}>
                    <Text style={{ color: selectedShopCategory === categoryName ? '#FFFFFF' : '#475569', fontSize: 12, fontWeight: '800' }}>{categoryName}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView showsVerticalScrollIndicator={false}>
                {(selectedShopCategory === 'Logros' || selectedShopCategory === 'Todos') && (
                  <View>
                    <Text style={{ color: '#991B1B', fontSize: 15, fontWeight: '900', marginBottom: 10 }}>{selectedShopCategory === 'Todos' ? 'Logros negativos 🤡' : 'Logros negativos desbloqueables 🤡'}</Text>
                    <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 12 }}>No se compran con monedas: se consiguen al acumular errores. Tus insignias desbloqueadas se guardan en tu perfil.</Text>
                    {NEGATIVE_ACHIEVEMENTS.map((achievement) => {
                      const isUnlocked = negativeAchievements.includes(achievement.id);
                      return (
                        <View key={achievement.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 17, padding: 14, marginBottom: 11, borderWidth: 1.5, borderColor: isUnlocked ? achievement.border : '#E2E8F0', flexDirection: 'row', alignItems: 'center', opacity: isUnlocked ? 1 : 0.72 }}>
                          <View style={{ width: 62, height: 62, borderRadius: 18, backgroundColor: achievement.color, borderWidth: 1, borderColor: achievement.border, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 34 }}>{achievement.emoji}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ color: '#7F1D1D', fontWeight: '900', fontSize: 15 }}>{achievement.name}</Text>
                            <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700', marginTop: 3 }}>English: {achievement.translation}</Text>
                            <Text style={{ color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 4 }}>{achievement.explanation}</Text>
                            <Text style={{ color: '#475569', fontSize: 12, marginTop: 6 }}>{achievement.requirement}</Text>
                            <Text style={{ color: '#64748B', fontSize: 11, marginTop: 3 }}>{achievement.description}</Text>
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>English: {achievement.descriptionTranslation}</Text>
                            <Text style={{ color: isUnlocked ? '#15803D' : '#B45309', fontWeight: '900', fontSize: 11, marginTop: 6 }}>{isUnlocked ? '✓ DESBLOQUEADO' : '🔒 BLOQUEADO'}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {selectedShopCategory !== 'Logros' && SHOP_AVATARS.filter((item) => selectedShopCategory === 'Todos' || item.category === selectedShopCategory).map((item) => {
                  const isOwned = ownedShopItems.includes(item.id);
                  const isEquipped = equippedAvatar === item.id;
                  const canAfford = coins >= item.price;
                  return (
                    <View key={item.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 17, padding: 14, marginBottom: 11, borderWidth: isEquipped ? 2 : 1, borderColor: isEquipped ? '#16A34A' : '#E2E8F0', flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 58, height: 58, borderRadius: 17, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                        <Text style={{ color: '#14532D', fontWeight: '800', fontSize: 15 }}>{item.name}</Text>
                        <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>{item.description}</Text>
                        <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '800', marginTop: 5 }}>{item.price === 0 ? 'Gratis' : `${item.price} pesos`}</Text>
                      </View>
                      <Pressable disabled={!isOwned && !canAfford} onPress={() => buyOrEquipAvatar(item)} style={{ backgroundColor: isEquipped ? '#DCFCE7' : isOwned ? '#E0E7FF' : canAfford ? '#14532D' : '#CBD5E1', paddingVertical: 10, paddingHorizontal: 11, borderRadius: 11 }}>
                        <Text style={{ color: isEquipped ? '#166534' : isOwned ? '#3730A3' : '#FFFFFF', fontWeight: '800', fontSize: 11 }}>{isEquipped ? 'Equipado' : isOwned ? 'Equipar' : 'Comprar'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
              <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 7 }}>Tus compras y tu avatar se guardan en este dispositivo.</Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }


  if (category === 'badwords') {
    const groups = ['Todas', 'Chingar', 'Insultos', 'Exclamaciones', 'Pedo y fiesta', 'Otras expresiones'];
    const normalizedSearch = badWordSearch.trim().toLocaleLowerCase();
    const visibleEntries = BAD_WORD_ENTRIES.filter((entry) =>
      (badWordGroup === 'Todas' || entry.group === badWordGroup) &&
      (!normalizedSearch || `${entry.term} ${entry.meaning} ${entry.english} ${entry.example}`.toLocaleLowerCase().includes(normalizedSearch))
    );

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#FFF7F7' }} contentContainerStyle={{ padding: 18, paddingBottom: 45 }}>
        <View style={{ backgroundColor: '#7F1D1D', borderRadius: 22, padding: 22, marginTop: 34, marginBottom: 18 }}>
          <Pressable
            onPress={() => router.setParams({ category: undefined })}
            style={{ alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 5 }}
          >
            <Text style={{ color: '#FECACA', fontWeight: '700' }}>← Back to MexicanSlang</Text>
          </Pressable>
          <Text style={{ fontSize: 34 }}>🤬 🇲🇽</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 8 }}>Bad Words: las buenas groserías</Text>
          <Text style={{ color: '#FEE2E2', fontSize: 14, lineHeight: 21, marginTop: 8 }}>
            Mexican Spanish has some wonderfully expressive swear words. Learn what they mean, how locals use them, and when NOT to say them.
          </Text>
          <View style={{ backgroundColor: '#991B1B', borderRadius: 13, padding: 12, marginTop: 14 }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>⚠️ Culture tip</Text>
            <Text style={{ color: '#FEE2E2', fontSize: 12, lineHeight: 18, marginTop: 4 }}>
              Some words are friendly between close friends but insulting with strangers. Slurs targeting sexual orientation or social class are explained for recognition, not recommended for use.
            </Text>
          </View>
        </View>

        <TextInput
          value={badWordSearch}
          onChangeText={setBadWordSearch}
          placeholder="Search: chingar, pedo, no mames…"
          placeholderTextColor="#94A3B8"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA', borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, color: '#1F2937', fontSize: 15, marginBottom: 12 }}
          autoCapitalize="none"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 15 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {groups.map((group) => (
            <Pressable key={group} onPress={() => setBadWordGroup(group)} style={{ backgroundColor: badWordGroup === group ? '#7F1D1D' : '#FFFFFF', borderWidth: 1, borderColor: badWordGroup === group ? '#7F1D1D' : '#FECACA', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13 }}>
              <Text style={{ color: badWordGroup === group ? '#FFFFFF' : '#7F1D1D', fontSize: 12, fontWeight: '800' }}>{group}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ color: '#7F1D1D', fontWeight: '800', fontSize: 13, marginBottom: 10 }}>{visibleEntries.length} expressions · {BAD_WORD_ENTRIES.length} in the guide</Text>
        {visibleEntries.map((entry) => (
          <View key={entry.term} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', padding: 15, marginBottom: 11 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ flex: 1, color: '#7F1D1D', fontSize: 19, fontWeight: '900' }}>{entry.term}</Text>
              <View style={{ backgroundColor: entry.level === 'Muy fuerte' ? '#FEE2E2' : entry.level === 'Fuerte' ? '#FEF3C7' : '#DCFCE7', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 }}>
                <Text style={{ color: entry.level === 'Muy fuerte' ? '#991B1B' : entry.level === 'Fuerte' ? '#92400E' : '#166534', fontSize: 10, fontWeight: '900' }}>{entry.level.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={{ color: '#334155', fontSize: 14, lineHeight: 20, marginTop: 7 }}>{entry.meaning}</Text>
            <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '700', marginTop: 8 }}>🇬🇧 {entry.english}</Text>
            <View style={{ backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10, marginTop: 10 }}>
              <Text style={{ color: '#9A3412', fontSize: 11, fontWeight: '900' }}>EXAMPLE · ESPAÑOL</Text>
              <Text style={{ color: '#7C2D12', fontSize: 13, lineHeight: 19, marginTop: 3 }}>{entry.example}</Text>
              <View style={{ height: 1, backgroundColor: '#FED7AA', marginVertical: 9 }} />
              <Text style={{ color: '#1D4ED8', fontSize: 11, fontWeight: '900' }}>🇬🇧 EXAMPLE · ENGLISH</Text>
              <Text style={{ color: '#1E40AF', fontSize: 13, lineHeight: 19, marginTop: 3 }}>{entry.exampleEnglish}</Text>
            </View>
            <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 9 }}>💡 {entry.note}</Text>
            <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 8 }}>{entry.group}</Text>
          </View>
        ))}
        {visibleEntries.length === 0 ? (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 15, padding: 22, alignItems: 'center' }}>
            <Text style={{ fontSize: 28 }}>🔎</Text>
            <Text style={{ color: '#7F1D1D', fontWeight: '800', marginTop: 8 }}>No expressions found</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Try another word or choose “Todas”.</Text>
          </View>
        ) : null}
        <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 12 }}>
          Mexican slang varies by region, age, relationship and tone. English translations are approximate, not word-for-word equivalents.
        </Text>
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
      showMexicanFeedback(option === step.correct);
      if (option === step.correct) {
        setConversationCorrect((previous) => previous + 1);
        setXp((previous) => previous + 10);
        earnCoins(1);
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
      router.setParams({ category: undefined });
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pageContent}>
       <BackButton label="Back to home" />

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
            {!!mexicanFeedbackMessage && <Text style={{ color: conversationAnswer === step.correct ? '#166534' : '#9A3412', fontSize: 16, fontWeight: '900', marginBottom: 9 }}>{mexicanFeedbackMessage}</Text>}
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
      showMexicanFeedback(matched);
      // This first version gives lightweight, local feedback; it does not send text to an AI service.
      if (matched) {
        setXp((previous) => previous + 5);
        earnCoins(1);
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
      router.setParams({ category: undefined });
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <BackButton label="Back to home" />

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
          <Text style={{ color: '#1E3A8A', fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Choose a real-life situation · Try full, natural replies</Text>
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
            {!!mexicanFeedbackMessage && <Text style={{ color: matched ? '#166534' : '#9A3412', fontSize: 16, fontWeight: '900', marginBottom: 9 }}>{mexicanFeedbackMessage}</Text>}
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


  if (category === 'culture') {
    const cultureGroups: CultureEntry['category'][] = [
      'Everyday slang',
      'Food & social life',
      'Useful expressions',
      'Regional expressions',
      'Customs & traditions',
    ];

    function speakFreeSpanish(example: string): void {
      throw new Error('Function not implemented.');
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pageContent}>
        <Pressable
          onPress={() => router.setParams({ category: undefined })}
          style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 18 }}
        >
          <Text style={{ color: '#334155', fontWeight: 'bold' }}>← Back to home</Text>
        </Pressable>

        <View style={{ backgroundColor: '#14532D', borderRadius: 22, padding: 22, marginBottom: 22 }}>
          <Text style={{ color: '#BBF7D0', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>LANGUAGE · CONTEXT · CULTURE</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 29, fontWeight: '800', marginTop: 8 }}>🇲🇽 Mexican Culture</Text>
          <Text style={{ color: '#DCFCE7', fontSize: 15, lineHeight: 23, marginTop: 8 }}>
            Learn what people mean, when they say it, and how to use it naturally and respectfully.
          </Text>
        </View>

        <View style={{ backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 22 }}>
          <Text style={{ color: '#9A3412', fontWeight: 'bold', fontSize: 14 }}>A useful cultural reminder</Text>
          <Text style={{ color: '#7C2D12', fontSize: 13, lineHeight: 20, marginTop: 5 }}>
            Mexican Spanish varies by region, age, and situation. These are common examples, not rules that every person uses in the same way.
          </Text>
        </View>

        {cultureGroups.map((group) => (
          <View key={group} style={{ marginBottom: 20 }}>
            <Text style={{ color: '#14532D', fontSize: 20, fontWeight: '800', marginBottom: 12 }}>{group}</Text>
            {cultureEntries.filter((entry) => entry.category === group).map((entry) => (
              <View key={entry.phrase} style={{ backgroundColor: '#FFFFFF', borderRadius: 17, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ color: '#14532D', fontSize: 22, fontWeight: '800' }}>{entry.phrase}</Text>
                <Text style={{ color: '#166534', fontSize: 15, fontWeight: '700', marginTop: 5 }}>{entry.meaning}</Text>
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, marginTop: 9 }}>
                  <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700' }}>{entry.register}</Text>
                </View>
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginTop: 14 }}>WHEN YOU’LL HEAR IT</Text>
                <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 4 }}>{entry.context}</Text>
                <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginTop: 13 }}>REAL-LIFE EXAMPLE</Text>
                <Text style={{ color: '#14532D', fontSize: 15, fontWeight: '700', marginTop: 4 }}>{entry.example}</Text>
                <Text style={{ color: '#64748B', fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginTop: 3 }}>{entry.translation}</Text>
                <View style={{ backgroundColor: '#FFFBEB', borderRadius: 11, padding: 12, marginTop: 13, borderWidth: 1, borderColor: '#FDE68A' }}>
                  <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '800' }}>🇲🇽 CULTURAL TIP</Text>
                  <Text style={{ color: '#78350F', fontSize: 13, lineHeight: 20, marginTop: 4 }}>{entry.note}</Text>
                </View>
                <Pressable
                  onPress={() => speakFreeSpanish(entry.example)}
                  style={{ alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, marginTop: 12 }}
                >
                  <Text style={{ color: '#166534', fontWeight: 'bold' }}>🔊 Listen to the example</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}
        <Text style={styles.footer}>Made with ❤️ in Mexico by Alan</Text>
      </ScrollView>
    );
  }

  if (category === 'review') {
    const currentReview = reviewItems[Math.min(reviewIndex, Math.max(reviewItems.length - 1, 0))];
    const reviewIsCorrect = currentReview && reviewSelectedAnswer === currentReview.correct;

    async function answerReview(option: string) {
      if (!currentReview || reviewSelectedAnswer !== '') return;
      setReviewSelectedAnswer(option);
      showMexicanFeedback(option === currentReview.correct);

      if (option === currentReview.correct) {
        setXp((previous) => previous + 5);
        earnCoins(1);
      } else {
        const updated = reviewItems
          .map((item) =>
            item.id === currentReview.id
              ? { ...item, attempts: item.attempts + 1 }
              : item
          )
          .sort((a, b) => b.attempts - a.attempts || a.addedAt - b.addedAt);
        await persistReviewItems(updated);
      }
    }

    async function continueReview() {
      if (reviewIsCorrect && currentReview) {
        const updated = reviewItems.filter((item) => item.id !== currentReview.id);
        await persistReviewItems(updated);

        // If this was an interactive-practice mistake, remove it from that
        // progress list too so the dashboard and Smart Review stay in sync.
        if (currentReview.id.startsWith('interactive:')) {
          const parts = currentReview.id.split(':');
          const level = parts[1];
          const exerciseId = parts.slice(2).join(':');
          const nextProgress: InteractiveProgress = {
            ...interactiveProgress,
            mistakes: interactiveProgress.mistakes.filter(
              (item) => !(item.id === exerciseId && item.level === level)
            ),
          };
          setInteractiveProgress(nextProgress);
          AsyncStorage.setItem(INTERACTIVE_PROGRESS_KEY, JSON.stringify(nextProgress)).catch((error) => {
            console.log('Error updating reviewed interactive progress:', error);
          });
        }

        if (updated.length === 0) {
          setReviewIndex(0);
          setReviewSelectedAnswer('');
          return;
        }
        // The next item shifts into the same index after removing this one.
      } else if (reviewIndex >= reviewItems.length - 1) {
        setReviewIndex(0);
        setReviewSelectedAnswer('');
        router.setParams({ category: undefined });
        return;
      } else {
        setReviewIndex((previous) => previous + 1);
      }
      setReviewSelectedAnswer('');
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pageContent}>
        <Pressable onPress={() => router.setParams({ category: undefined })} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 18 }}>
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
            <Pressable onPress={() => router.setParams({ category: undefined })} style={{ backgroundColor: '#14532D', borderRadius: 12, padding: 15, alignItems: 'center', alignSelf: 'stretch', marginTop: 20 }}>
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
                  {!!mexicanFeedbackMessage && <Text style={{ color: reviewIsCorrect ? '#166534' : '#9A3412', fontSize: 16, fontWeight: '900', marginBottom: 9 }}>{mexicanFeedbackMessage}</Text>}
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

  if (category === 'interactivepractice') {
    const levelItems = interactiveLevel
      ? interactivePracticeItems.filter((item) => getInteractiveExerciseLevel(item) === interactiveLevel)
      : [];
    if (!interactiveLevel) {
      const levels = [
        { id: 'beginner', title: 'Beginner', subtitle: 'Basic words and everyday expressions', detail: 'Start with the essentials', color: '#16A34A' },
        { id: 'intermediate', title: 'Intermediate', subtitle: 'Real conversations and common Mexican slang', detail: 'Build confidence in daily situations', color: '#D97706' },
        { id: 'advanced', title: 'Advanced', subtitle: 'Colloquial expressions and more natural phrases', detail: 'Sound more like a local', color: '#7C3AED' },
      ];
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.pageContent}>
          <Pressable onPress={() => router.setParams({ category: undefined })} style={{ alignSelf: 'flex-start', padding: 12, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 18 }}>
            <Text style={{ color: '#334155', fontWeight: 'bold' }}>← Back to home</Text>
          </Pressable>
          <Text style={{ color: '#1F2937', fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>Choose your level</Text>
          <Text style={{ color: '#64748B', fontSize: 15, lineHeight: 22, marginBottom: 20 }}>Choose a level to start practicing Mexican Spanish. You can change it whenever you want.</Text>

          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#DDD6FE', marginBottom: 20 }}>
            <Text style={{ color: '#4C1D95', fontSize: 19, fontWeight: 'bold' }}>📊 My Learning Progress</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {[
                { label: 'Completed', value: interactiveProgress.completedIds.length },
                { label: 'Attempts', value: interactiveProgress.totalAttempts },
                { label: 'Correct', value: interactiveProgress.correctAnswers },
                { label: 'Accuracy', value: `${interactiveProgress.totalAttempts ? Math.round((interactiveProgress.correctAnswers / interactiveProgress.totalAttempts) * 100) : 0}%` },
              ].map((item) => (
                <View key={item.label} style={{ backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, minWidth: '45%', flexGrow: 1 }}>
                  <Text style={{ color: '#6D28D9', fontSize: 21, fontWeight: 'bold' }}>{item.value}</Text>
                  <Text style={{ color: '#64748B', fontSize: 12, marginTop: 3 }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: '#4C1D95', fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>Progress by level</Text>
            {levels.map((item) => {
              const stats = interactiveProgress.byLevel[item.id] ?? { attempts: 0, correct: 0 };
              const percent = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
              const completed = interactiveProgress.completedIds.filter((savedId) => {
                const exerciseId = savedId.slice(savedId.indexOf(':') + 1);
                const savedExercise = interactivePracticeItems.find((exerciseItem) => exerciseItem.id === exerciseId);
                return !!savedExercise && getInteractiveExerciseLevel(savedExercise) === item.id;
              }).length;
              return (
                <View key={`progress-${item.id}`} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: '#334155', fontSize: 13, fontWeight: '600' }}>{item.title} · {completed}/30 completed</Text>
                    <Text style={{ color: '#64748B', fontSize: 12 }}>{percent}% accuracy</Text>
                  </View>
                  <View style={{ height: 7, backgroundColor: '#EDE9FE', borderRadius: 8, overflow: 'hidden' }}>
                    <View style={{ height: 7, width: `${(completed / 30) * 100}%`, backgroundColor: item.color, borderRadius: 8 }} />
                  </View>
                </View>
              );
            })}
            <Text style={{ color: '#64748B', fontSize: 12, marginTop: 5 }}>Mistakes to review: {interactiveProgress.mistakes.length}</Text>
            {interactiveProgress.mistakes.length > 0 && (
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDE9FE' }}>
                <Text style={{ color: '#92400E', fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>Recent mistakes</Text>
                {interactiveProgress.mistakes.slice(0, 3).map((mistake, index) => (
                  <View key={`${mistake.level}-${mistake.id}-${index}`} style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#334155', fontSize: 13 }}>{mistake.prompt}</Text>
                    <Text style={{ color: '#15803D', fontSize: 12, marginTop: 2 }}>Answer: {mistake.answer}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {levels.map((level) => (
            <Pressable key={level.id} onPress={() => { setInteractiveLevel(level.id as InteractiveLevel); setInteractiveIndex(0); setInteractiveCorrectCount(0); setInteractiveSessionXp(0); setInteractiveAnswered(false); setInteractiveAnswer(''); setInteractiveBlankAnswer(''); setInteractiveOrderedWords([]); }} style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: level.color, borderRadius: 18, padding: 20, marginBottom: 14 }}>
              <Text style={{ color: level.color, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>{level.detail}</Text>
              <Text style={{ color: '#1F2937', fontSize: 22, fontWeight: 'bold', marginTop: 5 }}>{level.title}</Text>
              <Text style={{ color: '#475569', fontSize: 14, marginTop: 6 }}>{level.subtitle}</Text>
              <Text style={{ color: level.color, fontWeight: 'bold', marginTop: 14 }}>30 exercises →</Text>
            </Pressable>
          ))}
        </ScrollView>
      );
    }
    const exercise = levelItems[interactiveIndex];
    const isLastExercise = interactiveIndex === levelItems.length - 1;
    if (interactiveLevel && !exercise) {
      return (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            No se encontraron ejercicios
          </Text>
          <Text style={{ marginBottom: 20, textAlign: 'center' }}>
            No hay ejercicios disponibles para este nivel o el índice está fuera de rango.
          </Text>
          <Pressable
            onPress={() => {
              setInteractiveIndex(0);
              setInteractiveLevel(null);
            }}
            style={{ backgroundColor: '#14532D', padding: 14, borderRadius: 10 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Volver a los niveles</Text>
          </Pressable>
        </View>
      );
    }
    const normalized = (value: string) => value.toLocaleLowerCase().replace(/[.!?¿¡,]/g, '').replace(/\\s+/g, ' ').trim();
    const submittedAnswer = exercise.type === 'choice'
      ? interactiveAnswer
      : exercise.type === 'blank'
        ? interactiveBlankAnswer
        : interactiveOrderedWords.join(' ');
    const expectedAnswer = exercise.type === 'order' ? exercise.answer.replace(/[.!?¿¡,]/g, '') : exercise.answer;
    const isInteractiveCorrect = normalized(submittedAnswer) === normalized(expectedAnswer);

    function submitInteractiveAnswer() {
      if (!interactiveLevel) return;
      if (interactiveAnswered || !submittedAnswer.trim()) return;
      setInteractiveAnswered(true);
      showMexicanFeedback(isInteractiveCorrect);

      const levelStats = interactiveProgress.byLevel[interactiveLevel] ?? { attempts: 0, correct: 0 };
      const previousMistake = interactiveProgress.mistakes.find(
        (item) => item.id === exercise.id && item.level === interactiveLevel
      );
      const mistakeAttempts = (previousMistake?.attempts ?? 0) + (isInteractiveCorrect ? 0 : 1);

      const nextProgress: InteractiveProgress = {
        totalAttempts: interactiveProgress.totalAttempts + 1,
        correctAnswers: interactiveProgress.correctAnswers + (isInteractiveCorrect ? 1 : 0),
        completedIds: interactiveProgress.completedIds.includes(`${interactiveLevel}:${exercise.id}`)
          ? interactiveProgress.completedIds
          : [...interactiveProgress.completedIds, `${interactiveLevel}:${exercise.id}`],
        mistakes: isInteractiveCorrect
          ? interactiveProgress.mistakes.filter((item) => !(item.id === exercise.id && item.level === interactiveLevel))
          : [
            {
              id: exercise.id,
              level: interactiveLevel,
              prompt: exercise.prompt,
              answer: exercise.answer,
              date: new Date().toISOString(),
              attempts: mistakeAttempts,
            },
            ...interactiveProgress.mistakes.filter((item) => !(item.id === exercise.id && item.level === interactiveLevel)),
          ].slice(0, 30),
        byLevel: {
          ...interactiveProgress.byLevel,
          [interactiveLevel]: {
            attempts: levelStats.attempts + 1,
            correct: levelStats.correct + (isInteractiveCorrect ? 1 : 0),
          },
        },
      };
      setInteractiveProgress(nextProgress);
      AsyncStorage.setItem(INTERACTIVE_PROGRESS_KEY, JSON.stringify(nextProgress)).catch((error) => {
        console.log('Error saving interactive practice progress:', error);
      });

      // Connect Interactive Practice errors to the existing Smart Review queue.
      const smartReviewId = `interactive:${interactiveLevel}:${exercise.id}`;
      if (isInteractiveCorrect) {
        const remainingReviewItems = reviewItems.filter((item) => item.id !== smartReviewId);
        if (remainingReviewItems.length !== reviewItems.length) {
          persistReviewItems(remainingReviewItems);
        }
      } else {
        const distractors = interactivePracticeItems
          .map((item) => item.answer)
          .filter((answer, index, all) => answer !== exercise.answer && all.indexOf(answer) === index);
        const reviewOptions = [exercise.answer, ...distractors].slice(0, 4);
        const existingReview = reviewItems.find((item) => item.id === smartReviewId);
        const smartReviewItem: ReviewItem = {
          id: smartReviewId,
          category: `Interactive Practice · ${interactiveLevel}`,
          phrase: exercise.answer,
          question: exercise.prompt,
          options: reviewOptions,
          correct: exercise.answer,
          example: exercise.explanation,
          attempts: mistakeAttempts,
          addedAt: existingReview?.addedAt ?? Date.now(),
        };
        const updatedReviewItems = [
          ...reviewItems.filter((item) => item.id !== smartReviewId),
          smartReviewItem,
        ].sort((a, b) => b.attempts - a.attempts || a.addedAt - b.addedAt);
        persistReviewItems(updatedReviewItems);
      }

      if (isInteractiveCorrect) {
        setInteractiveCorrectCount((previous) => previous + 1);
        setInteractiveSessionXp((previous) => previous + 5);
        setXp((previous) => previous + 5);
        earnCoins(1);
      }
    }

    function nextInteractiveExercise() {
      if (isLastExercise) {
        router.setParams({ category: undefined });
        return;
      }
      setInteractiveIndex((previous) => previous + 1);
      setInteractiveAnswer('');
      setInteractiveBlankAnswer('');
      setInteractiveOrderedWords([]);
      setInteractiveAnswered(false);
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.setParams({ category: undefined })} style={{ alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#E2E8F0', marginBottom: 18 }}>
          <Text style={{ color: '#334155', fontWeight: 'bold' }}>← Back to home</Text>
        </Pressable>

        <Pressable onPress={() => { setInteractiveLevel(null); setInteractiveIndex(0); setInteractiveAnswered(false); }} style={{ alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F3E8FF', marginBottom: 12 }}>
          <Text style={{ color: '#6D28D9', fontWeight: 'bold' }}>Change level</Text>
        </Pressable>

        <View style={{ backgroundColor: '#6D28D9', borderRadius: 22, padding: 22, marginBottom: 18 }}>
          <Text style={{ color: '#EDE9FE', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>MEXICAN SPANISH · SKILL BUILDER</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 27, fontWeight: 'bold', marginTop: 8 }}>🎯 Interactive practice</Text>
          <Text style={{ color: '#F5F3FF', fontSize: 14, lineHeight: 21, marginTop: 8 }}>Practice meaning, register, grammar, and natural phrasing. Some answers may look similar: choose the one that fits the situation, not just the dictionary translation.</Text>
          <View style={{ height: 7, backgroundColor: '#5B21B6', borderRadius: 8, overflow: 'hidden', marginTop: 16 }}>
            <View style={{ height: 7, width: `${((interactiveIndex + 1) / levelItems.length) * 100}%`, backgroundColor: '#FDE68A', borderRadius: 8 }} />
          </View>
          <Text style={{ color: '#EDE9FE', fontSize: 12, marginTop: 8 }}>Exercise {interactiveIndex + 1} of {levelItems.length} · {interactiveCorrectCount} correct</Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#DDD6FE' }}>
          <Text style={{ color: '#6D28D9', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 }}>
            {exercise.type === 'choice' ? '1 · MULTIPLE CHOICE' : exercise.type === 'blank' ? '2 · FILL IN THE BLANK' : '3 · BUILD THE SENTENCE'}
          </Text>
          <Text style={{ color: '#1F2937', fontSize: 20, fontWeight: 'bold', lineHeight: 28, marginTop: 12, marginBottom: 18 }}>{exercise.prompt}</Text>

          {exercise.type === 'choice' && exercise.options.map((option) => {
            const selected = interactiveAnswer === option;
            const correct = option === exercise.answer;
            return (
              <Pressable key={option} disabled={interactiveAnswered} onPress={() => setInteractiveAnswer(option)} style={{ backgroundColor: interactiveAnswered && correct ? '#DCFCE7' : selected ? '#EDE9FE' : '#F8FAFC', borderWidth: 1, borderColor: interactiveAnswered && correct ? '#16A34A' : selected ? '#7C3AED' : '#CBD5E1', borderRadius: 12, padding: 15, marginBottom: 10 }}>
                <Text style={{ color: '#1F2937', fontSize: 15 }}>{option}</Text>
              </Pressable>
            );
          })}

          {exercise.type === 'blank' && (
            <TextInput value={interactiveBlankAnswer} onChangeText={setInteractiveBlankAnswer} editable={!interactiveAnswered} placeholder="Type the missing word…" placeholderTextColor="#94A3B8" autoCapitalize="none" style={{ borderWidth: 1, borderColor: '#C4B5FD', borderRadius: 12, padding: 15, color: '#1F2937', fontSize: 16, marginBottom: 14 }} />
          )}

          {exercise.type === 'order' && (
            <>
              <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 10 }}>Tap the words in the correct order:</Text>
              <View style={{ minHeight: 54, flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#F5F3FF', borderRadius: 12, padding: 10, marginBottom: 14 }}>
                {interactiveOrderedWords.map((word, index) => (
                  <Pressable key={`${word}-${index}`} disabled={interactiveAnswered} onPress={() => setInteractiveOrderedWords((previous) => previous.filter((_, wordIndex) => wordIndex !== index))} style={{ backgroundColor: '#6D28D9', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{word} ×</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {exercise.words.map((word, index) => {
                  const occurrence = exercise.words.slice(0, index + 1).filter((item) => item === word).length;
                  const alreadyUsed = interactiveOrderedWords.filter((item) => item === word).length;
                  if (occurrence !== alreadyUsed + 1) return null;
                  return (
                    <Pressable key={`${word}-${index}`} disabled={interactiveAnswered} onPress={() => setInteractiveOrderedWords((previous) => [...previous, word])} style={{ backgroundColor: '#EDE9FE', borderWidth: 1, borderColor: '#C4B5FD', borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12 }}>
                      <Text style={{ color: '#5B21B6', fontWeight: 'bold' }}>{word}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable disabled={interactiveAnswered} onPress={() => setInteractiveOrderedWords([])} style={{ alignSelf: 'flex-start', paddingVertical: 7 }}>
                <Text style={{ color: '#6D28D9', fontWeight: 'bold' }}>Clear sentence</Text>
              </Pressable>
            </>
          )}

          {!interactiveAnswered ? (
            <Pressable disabled={!submittedAnswer.trim()} onPress={submitInteractiveAnswer} style={{ backgroundColor: submittedAnswer.trim() ? '#6D28D9' : '#C4B5FD', borderRadius: 13, padding: 15, alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 }}>Check answer</Text>
            </Pressable>
          ) : (
            <View style={{ backgroundColor: isInteractiveCorrect ? '#F0FDF4' : '#FFF7ED', borderColor: isInteractiveCorrect ? '#86EFAC' : '#FDBA74', borderWidth: 1, borderRadius: 14, padding: 15, marginTop: 10 }}>
              {!!mexicanFeedbackMessage && <Text style={{ color: isInteractiveCorrect ? '#166534' : '#9A3412', fontSize: 16, fontWeight: '900', marginBottom: 9 }}>{mexicanFeedbackMessage}</Text>}
              <Text style={{ color: isInteractiveCorrect ? '#166534' : '#9A3412', fontWeight: 'bold', fontSize: 18 }}>{isInteractiveCorrect ? 'Correct! +5 XP 🎉' : 'Not quite — keep learning 💪'}</Text>
              <Text style={{ color: '#334155', fontSize: 14, lineHeight: 21, marginTop: 8 }}>Answer: {exercise.answer}</Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21, marginTop: 6 }}>{exercise.explanation}</Text>
              <Pressable onPress={nextInteractiveExercise} style={{ backgroundColor: '#6D28D9', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 15 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{isLastExercise ? 'Finish practice →' : 'Next exercise →'}</Text>
              </Pressable>
            </View>
          )}
        </View>
        <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 18 }}>⚡ {xp} total XP · +{interactiveSessionXp} XP this session</Text>
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
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
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
                {!!mexicanFeedbackMessage && <Text style={{ color: selectedAnswer === question.correct ? '#166534' : '#9A3412', fontSize: 16, fontWeight: '900', marginBottom: 10 }}>{mexicanFeedbackMessage}</Text>}
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
          {negativeAchievements.length > 0 && (
            <View style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', borderWidth: 1, padding: 12, borderRadius: 14, marginVertical: 10 }}>
              <Text style={{ color: '#991B1B', fontWeight: '900', fontSize: 15 }}>Logros negativos 🤡</Text>
              <Text style={{ color: '#7F1D1D', marginTop: 5 }}>{negativeAchievements.join('  ·  ')}</Text>
              <Text style={{ color: '#991B1B', fontSize: 12, marginTop: 4 }}>Cada error consecutivo cuesta una moneda más. ¡A recuperarse!</Text>
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
        visible={feedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center', alignItems: 'center', padding: 26 }}>
          <Animated.View entering={ZoomIn.springify().damping(8)} style={{ width: '100%', maxWidth: 330, backgroundColor: '#FFFDF5', borderRadius: 24, padding: 26, alignItems: 'center', borderWidth: 3, borderColor: '#D6A84B' }}>
            <Text style={{ fontSize: 54 }}>{mexicanFeedbackMessage.startsWith('Logro negativo') ? '🏅' : (mexicanFeedbackMessage.includes('wey') || mexicanFeedbackMessage.includes('madres') || mexicanFeedbackMessage.includes('pájaro') ? '😅' : '🇲🇽')}</Text>
            <Text style={{ color: '#78350F', fontSize: 21, fontWeight: '900', textAlign: 'center', marginTop: 12 }}>{mexicanFeedbackMessage}</Text>
            <Text style={{ color: '#92400E', fontSize: 13, textAlign: 'center', marginTop: 10 }}>Saldo: {coins} pesos</Text>
            <Pressable onPress={() => setFeedbackModalVisible(false)} style={{ marginTop: 22, backgroundColor: '#166534', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 14 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '900' }}>¡Órale!</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

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
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  pageContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#E0E5DD',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#22A05A',
    borderRadius: 8,
  },
  quiz: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
