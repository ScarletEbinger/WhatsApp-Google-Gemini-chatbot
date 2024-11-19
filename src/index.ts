//initialize Importsa
import makeWASocket, { BufferJSON, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, WAMessage, jidDecode } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import {  writeFileSync, readFileSync } from 'fs'
import fs from 'fs'
import { GoogleGenerativeAI} from '@google/generative-ai'
import path from 'path'
import dotenv from 'dotenv'
import util from 'util'
import textToSpeech from '@google-cloud/text-to-speech'
import { AssemblyAI } from 'assemblyai';
import axios from 'axios';
import { Sticker, StickerTypes, IStickerOptions } from 'wa-sticker-formatter'
import { GoogleAIFileManager } from "@google/generative-ai/files"
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { removeBackground, Config } from "@imgly/background-removal-node"


dotenv.config();


/**
 * Connects to WhatsApp using Baileys library and handles message events.
 * This function initializes the connection to WhatsApp, manages authentication
 * state, and listens for incoming messages. It also handles reconnection
 * logic if the connection is closed due to specific reasons.
 * 
 * Listens for different types of messages, such as text, audio, image, and video,
 * and processes them accordingly. Supports features like sending stickers,
 * generating text-to-speech, transcribing audio, and interacting with Google
 * Generative AI for content generation based on user input.
 * 
 * Uses safety settings to handle and block harmful content categories.
 */
async function connectToWhatsapp(){
 console.log("👋 %chello", "color: cyan");
 console.log("🪅 %cstarting systems...", "color: cyan");
 console.log("🤖 %cattempting to connect", "color: orange");
 console.log("✨ %cplease wait!", "color: orange");
 const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
 const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
 })
 sock.ev.on ('creds.update', saveCreds);
 sock.ev.on('connection.update', (update) =>{
    const { connection , lastDisconnect } = update
    if(connection === 'close'){
        const shouldReconnect =
        lastDisconnect && lastDisconnect.error instanceof Boom && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
      
      console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
      
        // reconnect if not logged out
        if(shouldReconnect){
            connectToWhatsapp()
        }
    }else if(connection === 'open') {
      
        console.log("✅ %cconnected!", "color: green")
    }
 })
 sock.ev.on('messages.upsert', async ({ messages }) => {

    const logid = '120363329104433308@g.us'
    const m = messages[0];
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },{
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      
      },{
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      
      },
    ];
   console.log(JSON.stringify(m, undefined, 2))
    if (m.key.fromMe === false){
        const txtmsg = m.message?.extendedTextMessage?.text || m.message?.ephemeralMessage?.message?.extendedTextMessage?.text || m.message?.conversation || ''
        //check group and send stickers:
        if (m.key.remoteJid?.endsWith('@g.us')){

          if(txtmsg ==='!id'){

            await sock.sendMessage(m.key.remoteJid, {text: 'your group id is: ' + m.key.remoteJid})
          }
          if(txtmsg ==='!convite'){
            const code = await sock.groupInviteCode(m.key.remoteJid)
            await sock.sendMessage(m.key.remoteJid, {text: 'seu link de convite é: https://chat.whatsapp.com/' + code})
          }
        }
        if(m.key.remoteJid === '' ||  m.key.remoteJid === ''){
       // if(checkStickers(m.key.remoteJid)){
      
        
            // stickers part
            const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o))

            const stickerMeta: IStickerOptions = {
                author: 'SkayBot',
                pack: process.env.SB_PACK || 'A Whatsapp Bot that makes stickers! yey!',
              //  quality: +(process.env.SB_STICKER_QUALITY || 70)
              }
             // const jid = message.key.remoteJid || '',

  /**
   * Given a message, download the media and create a sticker from it
   * @param {WAMessage} message - the message containing the media to download
   * @param {string} [url] - the url of the image to use instead of the media in the message
   */
           const makeSticker = async (message: WAMessage, url = '') => {
                const jid = message.key.remoteJid || ''
                if (url) {
                  const sticker = new Sticker(url, stickerMeta)
                  await sock.sendMessage(jid, await sticker.toMessage())
                  await sock.sendMessage(logid, {text: message.key.participant + ' ' + message.pushName + ' made a sticker'})
                  await sock.sendMessage(logid, await sticker.toMessage())
                } else {
                  const buffer = <Buffer>await downloadMediaMessage(message, 'buffer', {})
              
                  const types = [
                    StickerTypes.FULL
                  ]
              
                  for (const type of types) {
                    const meta = clone(stickerMeta)
                    meta.type = type
                    const sticker = new Sticker(buffer, meta)
              
                  await sock.sendMessage(jid, await sticker.toMessage())
                  await sock.sendMessage(logid, {text: message.key.participant + ' ' + message.pushName + ' made a sticker'})
                  await sock.sendMessage(logid, await sticker.toMessage())
                  }
                }
              }
        
              if (
                m.message?.imageMessage ||
                m.message?.videoMessage ||
                m.message?.ephemeralMessage?.message?.imageMessage ||
                m.message?.viewOnceMessage?.message?.imageMessage ||
                m.message?.viewOnceMessage?.message?.videoMessage ||
                m.message?.viewOnceMessageV2?.message?.imageMessage ||
                m.message?.viewOnceMessageV2?.message?.videoMessage
              ) {
           
              await makeSticker(m)
              //continue
              if (
                m.message?.imageMessage ||
                m.message?.ephemeralMessage?.message?.imageMessage ||
                m.message?.viewOnceMessage?.message?.imageMessage ||
                m.message?.viewOnceMessageV2?.message?.imageMessage
              ) {
                const mediaPath = './downloadade-media/';
      
      const buffer: Buffer = await downloadMediaMessage(
          m,
          'buffer',
          { },
          
      ) as Buffer; 
      try {
             await fs.accessSync(mediaPath);
          }catch(error){
              if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                  //directory doesn't existe, create it
                 await fs.mkdirSync(mediaPath);
              
              } else{
                  //other error show log
                  console.error('error checking directory:', error);
              }
          }
      
      const extension = 'jpg';
      const fileName = new Date().getTime();
      const fullFileName = mediaPath + fileName + '.' + extension;
      //save file
      try{
          await fs.writeFileSync(fullFileName, buffer);
          console.log('  -  file downloaded succesfully as: ', fullFileName)

      }catch(error){
          console.error(error);
      } 
const nametwo = fullFileName + '.png'
      const Jimp = require("jimp");

// Load the JPG image
Jimp.read(fullFileName)
  .then((image: any) => {
    // Convert to PNG
    
    return image.write(nametwo);
  })
  .catch((err: any) => {
    console.error("Error converting image:", err);
  });
   
      const nameup = fullFileName
              
  /**
   * Make a sticker with background removed from a image.
   * @param {string} nameup - The path to the image file.
   * @param {object} message - The message object from whatsapp-web.js.
   * @returns {Promise<void>}
   */
                const makeStickerBG = async (nameup: string, message: any) => {
                  let image_src: ImageData | ArrayBuffer | Uint8Array | Blob | URL | string = nameup;
               
                  
                  try {
                    const blob: Blob = await removeBackground (image_src);
                    const arrayBuffer = await blob.arrayBuffer();
                    const pngBuffer = Buffer.from(arrayBuffer);
              
                    if (pngBuffer) {
                      const sticker = new Sticker(pngBuffer, stickerMeta);
                      await sock.sendMessage(message.key.remoteJid, await sticker.toMessage());
                    } else {
                      const types = [StickerTypes.FULL];
              
                      for (const type of types) {
                        const meta = clone(stickerMeta);
                        meta.type = type;
                        const sticker = new Sticker(pngBuffer, meta);
                        await sock.sendMessage(message.key.remoteJid, await sticker.toMessage());
                      }
                    
                    }
                  } catch (error) {
                    await sock.sendMessage(message.key.remoteJid, {text: 'Imagem muito pequena pra remover o fundo, recomendo usar o site https://waifu2x.io/ pra aumentar a resoluçào e tentar de novo!'})

                    console.error('Error removing background:', error);
                    }
                };
              
                await makeStickerBG(nameup, m);
              }
              

 }

    
              }
        
        
        
       // if messages comes from "encaminhar audio" or "Amigas da Dorothy #Bot"
        if(m.key.remoteJid === '@g.us' ||  m.key.remoteJid === '@g.us' || m.key.remoteJid === '@g.us' || m.key.remoteJid === '@g.us'){
            // checks if a message starts with "tts" to make it a audio
            const id = m.key.remoteJid
        const messageType = Object.keys (m.message?.ephemeralMessage?.message || m.message || {})[0]// get what type of message it is -- text, image, video
        if (txtmsg.toLocaleLowerCase().startsWith('tts')){
            const id = m.key.remoteJid || ''
            console.log('TTS detected:' + txtmsg.slice(3))
            const reactionMessage = {
                react: {
                    text: "🤖", // use an empty string to remove the reaction
                    key: m.key
                }
            }
            await sock.sendMessage(id, reactionMessage)
            const name = m.messageTimestamp || 'audio'
            const msg = txtmsg.slice(3)
            const mediaPath = './downloadade-media/';
            try {
                await fs.accessSync(mediaPath);
             }catch(error){
                 if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                     //directory doesn't existe, create it
                    await fs.mkdirSync(mediaPath);
                 
                 } else{
                     //other error show log
                     console.error('error checking directory:', error);
                 }
             }
            async function convertTextToSpeech(msg: string) {
                try {
                  const textToSpeechClient = new textToSpeech.TextToSpeechClient();
              
                  const request = {
                    input: {text: msg},
                    voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                    audioConfig: {audioEncoding: 3}, // Set audio encoding as needed
                  };
              
                  // Perform the text-to-speech conversion
                  const [response] = await textToSpeechClient.synthesizeSpeech(request);
              
                  // Return the audio data
                 // return response.audioContent;
                  const writeFile = util.promisify(fs.writeFile)
                  
  await writeFile(mediaPath + name + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
  console.log('Audio content written to file: ' + name + '.mp3');
                } catch (error){
              console.error(error);
              } 
              }
              const audioData = await convertTextToSpeech(msg);
              // Function to send the TTS audio to the user
              async function sendTextToSpeech() {  
              try{  
             const filename = mediaPath + name + '.mp3';
             await sock.sendMessage(
                id, 
                { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, 
                //{ url: filename }, // can send mp3, mp4, & ogg
            )
            await sock.sendMessage(logid, {text: m.key.participant + ' ' + m.pushName + 'made a tts'})
            await sock.sendMessage(
              logid, 
              { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, 
              //{ url: filename }, // can send mp3, mp4, & ogg
          )

              } catch (error){
              console.error(error);
               }}
                
              await sendTextToSpeech();
              
              
              
        }  if(messageType === 'audioMessage') {
            const mediaPath = './downloadade-media/';
            
            const buffer: Buffer = await downloadMediaMessage(
                m,
                'buffer',
                { },
                
            ) as Buffer; 
            try {
                   await fs.accessSync(mediaPath);
                }catch(error){
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                        //directory doesn't existe, create it
                       await fs.mkdirSync(mediaPath);
                    
                    } else{
                        //other error show log
                        console.error('error checking directory:', error);
                    }
                }
            
            const extension = 'ogg';
            const fileName = new Date().getTime();
            const fullFileName = mediaPath + fileName + '.' + extension;
            //save file
            try{
                await fs.writeFileSync(fullFileName, buffer);
                console.log('  -  file downloaded succesfully as: ', fullFileName)
		await sock.sendMessage(id, {text: '✨SkayBot TalkPro está pensando...'})
                console.log('  -  audio query on SkayBot talkPro: \n' )
                
            }catch(error){
                console.error(error);
            } 

            const reactionMessage = {
                react: {
                    text: "🤖", // use an empty string to remove the reaction
                    key: m.key
                }
            }
            await sock.sendMessage(id, reactionMessage)
            const baseUrl = 'https://api.assemblyai.com/v2';

			const headers = {
			   authorization: '8c85a3e853bb44b484a2824248f6c1f4' 
}
/**
 * Uploads an audio file to AssemblyAI and transcribes it, then uses the transcription
 * as a query to the Gemini model to generate a response.
 * @param {Buffer} audioData - The audio data to transcribe.
 * @param {string} id - The chat ID to send the response to.
 * @param {import("whatsapp-web.js").Message} m - The message to reply to.
 * @returns {Promise<void>}
 */
async function transcribeAudio() {			
const path = fullFileName
try {
const audioData = buffer
const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
  headers
});
const uploadUrl = uploadResponse.data.upload_url
const data = {
audio_url: uploadUrl,
language_code: 'pt'
}
const url = `${baseUrl}/transcript`
const response = await axios.post(url, data, { headers: headers })
const transcriptId = response.data.id
const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`

while (true) {
  const pollingResponse = await axios.get(pollingEndpoint, {
    headers: headers
  })
  const transcriptionResult = pollingResponse.data

  if (transcriptionResult.status === 'completed') {
    console.log(transcriptionResult.text)
    const msg = transcriptionResult.text
    const audmsg = ('✨SkayBot AudioResolver: \n  ' + msg + '"')
    await sock.sendMessage(id, {text: audmsg}, {quoted: m})
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
             
            const prompt = msg
		console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
            const result = await model.generateContent('por favor resuma a transcriçao a seguir em poucas palavras: ' + prompt);
            const response = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + ' translated an audio about: ' + response.text()});
               }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
    
    
    break; // Exit the loop once transcription is completed
  }}} catch (error) {
    console.log(error);
  }
} transcribeAudio();  
}
            
    }



    if(m.key.remoteJid === '@g.us' || m.key.remoteJid === '@g.us'){
      const id = m.key.remoteJid
      if(m.message?.imageMessage ||
        m.message?.ephemeralMessage?.message?.imageMessage ||
        m.message?.viewOnceMessage?.message?.imageMessage ||
        m.message?.viewOnceMessageV2?.message?.imageMessage) {
          const mediaPath = './downloadade-media/';
          
          const buffer: Buffer = await downloadMediaMessage(
              m,
              'buffer',
              { },
              
          ) as Buffer; 
          try {
                 await fs.accessSync(mediaPath);
              }catch(error){
                  if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                      //directory doesn't existe, create it
                     await fs.mkdirSync(mediaPath);
                  
                  } else{
                      //other error show log
                      console.error('error checking directory:', error);
                  }
              }
          
          const extension = "jpg";
          const fileName = new Date().getTime();
          const fullFileName = mediaPath + fileName + '.' + extension;
          //save file
          try{
              await fs.writeFileSync(fullFileName, buffer);
              console.log('  -  file downloaded succesfully as: ', fullFileName)
  await sock.sendMessage(id, {text: '✨SkayBot SightPro está pensando...'})
      const reactionMessage = {
          react: {
              text: "🤖", // use an empty string to remove the reaction
              key: m.key
          }
      }
      await sock.sendMessage(id, reactionMessage)
              console.log('  -  🖼️📸Image query on SkayBot SightPro: \n' + m.message?.imageMessage?.caption)
              if(extension !== "jpg"){
                  fs.unlink(fullFileName, () =>{});
                  console.log('file deleted');

              }
          }catch(error){
              console.error(error);
          } // Access your API key as an environment variable (see "Set up your API key" above)
         
          
          
       
          async function run() {
            const dispnm = new Date().getTime().toString();
            const fileManager = new GoogleAIFileManager(process.env.AI_API_KEY || ' ');
            const uploadResult = await fileManager.uploadFile(fullFileName, {
              mimeType: "image/jpeg",
              displayName: dispnm,
            });
            
        
            const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || ' ');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings });
          
            const prompt = m.message?.imageMessage?.caption || m.message?.ephemeralMessage?.message?.imageMessage?.caption || m.message?.viewOnceMessage?.message?.imageMessage?.caption || m.message?.viewOnceMessageV2?.message?.imageMessage?.caption || ' ';
            console.log('  -  💫💭SkayBot SightPro is processing image query: \n' + prompt)
            const promptTwo = 'Responda apenas em português do brazil: ' +  prompt
            const result = await model.generateContent([
              { text: promptTwo },
              {
                fileData: {
                  mimeType: uploadResult.file.mimeType,
                  fileUri: uploadResult.file.uri
                }
              },
            ]);
            const response = await result.response;
            
            try{
              const text = ('✨SkayBot SightPro:' + response.text())
              console.log('  -  ✅💬SightPro proceesing resulted in: \n' + text);
              await sock.sendMessage(id, { text: text}, { quoted: m});
              const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
          
            const prompt = response.text()
		console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
            const result = await model.generateContent('por favor resuma o assunto do texto a seguir em poucas palavras: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + ' asked AI with a image about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
              
              
              const msgname = m.messageTimestamp || 'audio'
              const msg = response.text()
              const mediaPath = './downloadade-media/';
              try {
                  await fs.accessSync(mediaPath);
               }catch(error){
                   if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                       //directory doesn't existe, create it
                      await fs.mkdirSync(mediaPath);
                   
                   } else{
                       //other error show log
                       console.error('error checking directory:', error);
                   }
               }
  /**
   * Converts a given text string to an audio file using Google's Text-to-Speech API.
   * @param {string} msg The text string to convert to audio.
   * @returns {Promise<void>}
   */
              async function convertTextToSpeech(msg: string) {
                  try {
                    const textToSpeechClient = new textToSpeech.TextToSpeechClient();
                
                    const request = {
                      input: {text: msg},
                      voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                      audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
                    };
                
                    // Perform the text-to-speech conversion
                    const [response] = await textToSpeechClient.synthesizeSpeech(request);
                
                    // Return the audio data
                   // return response.audioContent;
                    const writeFile = util.promisify(fs.writeFile)
                    
    await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
    console.log('Audio content written to file: ' + msgname + '.mp3');
                  } catch (error){
                console.error(error);
                } 
                }
                const audioData = await convertTextToSpeech(msg);
                // Function to send the TTS audio to the user
                async function sendTextToSpeech() {  
                try{  
               
               const filename = mediaPath + msgname + '.mp3';
               await sock.sendMessage(
                  id, 
                  { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
                  //{ url: filename }, // can send mp3, mp4, & ogg
              )
                } catch (error){
                console.error(error);
                 }}
                  
                await sendTextToSpeech();
                
          } catch (error){
              console.error('security violation', error);
              await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅‍♀️🚫🛑🔞❗ não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
              console.log('  -  🛑not responded due to safety issues');
          }
          }
          run();
          
}
if(m.message?.videoMessage ||
  m.message?.viewOnceMessage?.message?.videoMessage ||
  m.message?.viewOnceMessageV2?.message?.videoMessage) {
    const mediaPath = './downloadade-media/';
    
    const buffer: Buffer = await downloadMediaMessage(
        m,
        'buffer',
        { },
        
    ) as Buffer; 
    try {
           await fs.accessSync(mediaPath);
        }catch(error){
            if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                //directory doesn't existe, create it
               await fs.mkdirSync(mediaPath);
            
            } else{
                //other error show log
                console.error('error checking directory:', error);
            }
        }
    
    const extension = "mp4";
    const fileName = new Date().getTime();
    const fullFileName = mediaPath + fileName + '.' + extension;
    //save file
    try{
        await fs.writeFileSync(fullFileName, buffer);
        console.log('  -  file downloaded succesfully as: ', fullFileName)
await sock.sendMessage(id, {text: '✨SkayBot SightPro está pensando...'})
const reactionMessage = {
    react: {
        text: "🤖", // use an empty string to remove the reaction
        key: m.key
    }
}
await sock.sendMessage(id, reactionMessage)
        console.log('  -  🖼️📸Image query on SkayBot SightPro: \n' + m.message?.imageMessage?.caption)
        if(extension !== "mp4"){
            fs.unlink(fullFileName, () =>{});
            console.log('file deleted');

        }
    }catch(error){
        console.error(error);
    } // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || ' ');
    
    // Converts local file information to a GoogleGenerativeAI.Part object.
    function fileToGenerativePart(path: string, mimeType: string) {
      return {
        inlineData: {
          data: Buffer.from(fs.readFileSync(path)).toString("base64"),
          mimeType
        },
      };
    }
    
    async function run() {
      
      const fileManager = new GoogleAIFileManager(process.env.AI_API_KEY || ' ');
      const uploadResult = await fileManager.uploadFile(fullFileName, {
        mimeType: "video/mp4",
        displayName: "video_" + fileName,
      });
      
      // View the response.
   console.log(`Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`);

      const getResult = await fileManager.getFile(uploadResult.file.name);
      console.log(`Retrieved file ${getResult.displayName} as ${getResult.uri}`);


      const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || ' ');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
      const video = {
        inlineData: {
          data: Buffer.from(fs.readFileSync(fullFileName)).toString("base64"),
          mimeType: "video/mp4",
        },
      };
      
      
      const prompt = m.message?.videoMessage?.caption || m.message?.ephemeralMessage?.message?.videoMessage?.caption || m.message?.viewOnceMessage?.message?.videoMessage?.caption || m.message?.viewOnceMessageV2?.message?.videoMessage?.caption || ' ';
      console.log('  -  💫💭SkayBot SightPro is processing image query: \n' + prompt)
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: getResult.uri
          }
        },
        { text: prompt},
      ]);
      const response = await result.response;
      
      try{
        const text = ('✨SkayBot SightPro:' + response.text())
        console.log('  -  ✅💬SightPro proceesing resulted in: \n' + text);
        await sock.sendMessage(id, { text: text}, { quoted: m});
        const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
           
            const prompt = response.text()
		console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
            const result = await model.generateContent('por favor resuma o assunto do texto a seguir em poucas palavras: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + ' asked AI with a video about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
        
        const msgname = m.messageTimestamp || 'audio'
        const msg = response.text()
        const mediaPath = './downloadade-media/';
        try {
            await fs.accessSync(mediaPath);
         }catch(error){
             if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                 //directory doesn't existe, create it
                await fs.mkdirSync(mediaPath);
             
             } else{
                 //other error show log
                 console.error('error checking directory:', error);
             }
         }
        async function convertTextToSpeech(msg: string) {
            try {
              const textToSpeechClient = new textToSpeech.TextToSpeechClient();
          
              const request = {
                input: {text: msg},
                voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
              };
          
              // Perform the text-to-speech conversion
              const [response] = await textToSpeechClient.synthesizeSpeech(request);
          
              // Return the audio data
             // return response.audioContent;
              const writeFile = util.promisify(fs.writeFile)
              
await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
console.log('Audio content written to file: ' + msgname + '.mp3');
            } catch (error){
          console.error(error);
          } 
          }
          const audioData = await convertTextToSpeech(msg);
          // Function to send the TTS audio to the user
          async function sendTextToSpeech() {  
          try{  
         
         const filename = mediaPath + msgname + '.mp3';
         await sock.sendMessage(
            id, 
            { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
            //{ url: filename }, // can send mp3, mp4, & ogg
        )
          } catch (error){
          console.error(error);
           }}
            
          await sendTextToSpeech();
          
    } catch (error){
        console.error('security violation', error);
        await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅‍♀️🚫🛑🔞❗ não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
        console.log('  -  🛑not responded due to safety issues');
    }
    }
    run();
    
}

if(txtmsg.startsWith('.')){
  await sock.sendMessage(id, {text: '✨SkayBot TalkPro está pensando...'});
  const reactionMessage = {
      react: {
          text: "🤖", // use an empty string to remove the reaction
          key: m.key
      }
  }
  await sock.sendMessage(id, reactionMessage)

  const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
 
  const msg = txtmsg.slice(1)
  const prompt = ('' + msg)
console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
  const result = await model.generateContent(prompt);
  const response = await result.response;
 
  try{
      const text = ('✨SkayBot TalkPro: \n' + response.text())
      console.log('  -  ✅💬TalkPro query processed with response: \n' + text )
      await sock.sendMessage(id, { text: text}, { quoted: m});
      const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
             
            const prompt = response.text()
            const result = await model.generateContent('por favor resuma a o assunto a seguir como um titulo sobre o assunto: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ' ' + m.pushName + ' asked ai about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
      const msgname = m.messageTimestamp || 'audio'
      const msg = response.text()
      const mediaPath = './downloadade-media/';
      try {
          await fs.accessSync(mediaPath);
       }catch(error){
           if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
               //directory doesn't existe, create it
              await fs.mkdirSync(mediaPath);
           
           } else{
               //other error show log
               console.error('error checking directory:', error);
           }
       }
      async function convertTextToSpeech(msg: string) {
          try {
            const textToSpeechClient = new textToSpeech.TextToSpeechClient();
        
            const request = {
              input: {text: msg},
              voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
              audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
            };
        
            // Perform the text-to-speech conversion
            const [response] = await textToSpeechClient.synthesizeSpeech(request);
        
            // Return the audio data
           // return response.audioContent;
            const writeFile = util.promisify(fs.writeFile)
            
await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
console.log('Audio content written to file: ' + msgname + '.mp3');
          } catch (error){
        console.error(error);
        } 
        }
        const audioData = await convertTextToSpeech(msg);
        // Function to send the TTS audio to the user
        async function sendTextToSpeech() {  
        try{  
       // await client.sendMessage(message.from, audioData ,{ sendAudioAsVoice: true });
       const filename = mediaPath + msgname + '.mp3';
       await sock.sendMessage(
          id, 
          { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
          //{ url: filename }, // can send mp3, mp4, & ogg
      )
        } catch (error){
        console.error(error);
         }}
          
        await sendTextToSpeech();
  } catch (error){
      console.error('security violation', error);
      await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅♀️🚫🛑🔞❗não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
      console.log('  -  🛑Not responded due to safety issues');
  }
  
}

    }
    

 if(m.key.remoteJid === '@g.us' || m.key.remoteJid === '@g.us' ){
        const id = m.key.remoteJid
        
        const messageType = Object.keys (m.message?.ephemeralMessage?.message || m.message || {})[0]// get what type of message it is -- text, image, video
      if(messageType === 'audioMessage') {
        // audio request GPT
            const mediaPath = './downloadade-media/';
            
            const buffer: Buffer = await downloadMediaMessage(
                m,
                'buffer',
                { },
                
            ) as Buffer; 
            try {
                   await fs.accessSync(mediaPath);
                }catch(error){
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                        //directory doesn't existe, create it
                       await fs.mkdirSync(mediaPath);
                    
                    } else{
                        //other error show log
                        console.error('error checking directory:', error);
                    }
                }
            
            const extension = 'ogg';
            const fileName = new Date().getTime();
            const fullFileName = mediaPath + fileName + '.' + extension;
            //save file
            try{
                await fs.writeFileSync(fullFileName, buffer);
                console.log('  -  file downloaded succesfully as: ', fullFileName)
		await sock.sendMessage(id, {text: '✨SkayBot TalkPro está pensando...'})
                //console.log('  -  audio query on SkayBot talkPro: \n' +)
                
            }catch(error){
                console.error(error);
            } 

            const reactionMessage = {
                react: {
                    text: "🤖", // use an empty string to remove the reaction
                    key: m.key
                }
            }
            await sock.sendMessage(id, reactionMessage)
            const baseUrl = 'https://api.assemblyai.com/v2';

			const headers = {
			   authorization: '8c85a3e853bb44b484a2824248f6c1f4' 
}
async function transcribeAudio() {			
const path = fullFileName
try {
const audioData = await fs.promises.readFile(path)
const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
  headers
});
const uploadUrl = uploadResponse.data.upload_url
const data = {
audio_url: uploadUrl,
language_code: 'pt'
}
const url = `${baseUrl}/transcript`
const response = await axios.post(url, data, { headers: headers })
const transcriptId = response.data.id
const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`

while (true) {
  const pollingResponse = await axios.get(pollingEndpoint, {
    headers: headers
  })
  const transcriptionResult = pollingResponse.data

  if (transcriptionResult.status === 'completed') {
    console.log(transcriptionResult.text)
    const msg = transcriptionResult.text
    const audmsg = ('✨SkayBot AudioResolver: \n 💫Sua pergunta foi: \n "' + msg + '"')
    await sock.sendMessage(id, {text: audmsg}, {quoted: m})
    //message.reply(transcriptionResult.text)
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
    const prompt = ('' + msg)
   const result = await model.generateContent(prompt);
    const response = await result.response;
   
    try{
        const text = ('✨SkayBot TalkPro: \n' + response.text())
        
        await sock.sendMessage(id, { text: text}, { quoted: m});
        const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
           
            const prompt = response.text()
		
            const result = await model.generateContent('por favor resuma o assunto do texto a seguir em poucas palavras: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + 'asked ai with audio about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
        const msgname = m.messageTimestamp || 'audio'
        const msg = response.text()
        const mediaPath = './downloadade-media/';
    try {
            await fs.accessSync(mediaPath);
         }catch(error){
             if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                 //directory doesn't existe, create it
                await fs.mkdirSync(mediaPath);
             
             } else{
                 //other error show log
                 console.error('error checking directory:', error);
             }
         }
        async function convertTextToSpeech(msg: string) {
            try {
              const textToSpeechClient = new textToSpeech.TextToSpeechClient();
          
              const request = {
                input: {text: msg},
                voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
              };
          
              // Perform the text-to-speech conversion
              const [response] = await textToSpeechClient.synthesizeSpeech(request);
          
              // Return the audio data
             // return response.audioContent;
              const writeFile = util.promisify(fs.writeFile)
              
await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
console.log('Audio content written to file: ' + msgname + '.mp3');
            } catch (error){
          console.error(error);
          } 
          }
          const audioData = await convertTextToSpeech(msg);
          // Function to send the TTS audio to the user
          async function sendTextToSpeech() {  
          try{  
         // await client.sendMessage(message.from, audioData ,{ sendAudioAsVoice: true });
         const filename = mediaPath + msgname + '.mp3';
         await sock.sendMessage(
            id, 
            { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
            //{ url: filename }, // can send mp3, mp4, & ogg
        )
          } catch (error){
          console.error(error);
           }}
        
          await sendTextToSpeech();
    } catch (error){
        console.error('security violation', error);
        await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅♀️🚫🛑🔞❗não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
        console.log('  -  🛑Not responded due to safety issues');
    }




    break
  } else if (transcriptionResult.status === 'error') {
    throw new Error(`Transcription failed: ${transcriptionResult.error}`)
  } else {
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}

} catch (error) {
    console.error('Error:', error);
    }
    }
    transcribeAudio();    } 



    if(m.key.remoteJid === '@g.us' || m.key.remoteJid === '@g.us' ){
        const id = m.key.remoteJid
        const messageType = Object.keys (m.message?.ephemeralMessage?.message || m.message || {})[0]// get what type of message it is -- text, image, video
      if(messageType === 'audioMessage') {
            const mediaPath = './downloadade-media/';
            
            const buffer: Buffer = await downloadMediaMessage(
                m,
                'buffer',
                { },
                
            ) as Buffer; 
            try {
                   await fs.accessSync(mediaPath);
                }catch(error){
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                        //directory doesn't existe, create it
                       await fs.mkdirSync(mediaPath);
                    
                    } else{
                        //other error show log
                        console.error('error checking directory:', error);
                    }
                }
            
            const extension = 'ogg';
            const fileName = new Date().getTime();
            const fullFileName = mediaPath + fileName + '.' + extension;
            //save file
            try{
                await fs.writeFileSync(fullFileName, buffer);
                console.log('  -  file downloaded succesfully as: ', fullFileName)
		await sock.sendMessage(id, {text: '✨SkayBot TalkPro está pensando...'})
                //console.log('  -  audio query on SkayBot talkPro: \n' +)
                
            }catch(error){
                console.error(error);
            } 

            const reactionMessage = {
                react: {
                    text: "🤖", // use an empty string to remove the reaction
                    key: m.key
                }
            }
            await sock.sendMessage(id, reactionMessage)
            const baseUrl = 'https://api.assemblyai.com/v2';

			const headers = {
			   authorization: '8c85a3e853bb44b484a2824248f6c1f4' 
}
async function transcribeAudio() {			
const path = fullFileName
try {
const audioData = await fs.promises.readFile(path)
const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
  headers
});
const uploadUrl = uploadResponse.data.upload_url
const data = {
audio_url: uploadUrl,
language_code: 'pt'
}
const url = `${baseUrl}/transcript`
const response = await axios.post(url, data, { headers: headers })
const transcriptId = response.data.id
const pollingEndpoint = `${baseUrl}/transcript/${transcriptId}`

while (true) {
  const pollingResponse = await axios.get(pollingEndpoint, {
    headers: headers
  })
  const transcriptionResult = pollingResponse.data

  if (transcriptionResult.status === 'completed') {
    console.log(transcriptionResult.text)
    const msg = transcriptionResult.text
    const audmsg = ('✨SkayBot AudioResolver: \n 💫Sua pergunta foi: \n "' + msg + '"')
    await sock.sendMessage(id, {text: audmsg}, {quoted: m})
    //message.reply(transcriptionResult.text)
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
    //const messageOne = m.message.ephemeralMessage?.message?.extendedTextMessage?.text
   // const messageTwo = m.message.extendedTextMessage?.text || m.message.ephemeralMessage?.message?.extendedTextMessage?.text
  //const prompt = (' ' + messageTwo?.slice(1)) 
//         const msg = m.message?.extendedTextMessage?.text?.slice(1) || m.message.ephemeralMessage?.message?.extendedTextMessage?.text?.slice(1)
    const prompt = ('' + msg)
console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
    const result = await model.generateContent(prompt);
    const response = await result.response;
   
    try{
        const text = ('✨SkayBot TalkPro: \n' + response.text())
        console.log('  -  ✅💬TalkPro query processed with response: \n' + text )
        await sock.sendMessage(id, { text: text}, { quoted: m});
        const msgname = m.messageTimestamp || 'audio'
        const msg = response.text()
        const mediaPath = './downloadade-media/';
    try {
            await fs.accessSync(mediaPath);
         }catch(error){
             if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                 //directory doesn't existe, create it
                await fs.mkdirSync(mediaPath);
             
             } else{
                 //other error show log
                 console.error('error checking directory:', error);
             }
         }
        async function convertTextToSpeech(msg: string) {
            try {
              const textToSpeechClient = new textToSpeech.TextToSpeechClient();
          
              const request = {
                input: {text: msg},
                voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
              };
          
              // Perform the text-to-speech conversion
              const [response] = await textToSpeechClient.synthesizeSpeech(request);
          
              // Return the audio data
             // return response.audioContent;
              const writeFile = util.promisify(fs.writeFile)
              
await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
console.log('Audio content written to file: ' + msgname + '.mp3');
            } catch (error){
          console.error(error);
          } 
          }
          const audioData = await convertTextToSpeech(msg);
          // Function to send the TTS audio to the user
          async function sendTextToSpeech() {  
          try{  
         // await client.sendMessage(message.from, audioData ,{ sendAudioAsVoice: true });
         const filename = mediaPath + msgname + '.mp3';
         await sock.sendMessage(
            id, 
            { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
            //{ url: filename }, // can send mp3, mp4, & ogg
        )
          } catch (error){
          console.error(error);
           }}
        
          await sendTextToSpeech();
    } catch (error){
        console.error('security violation', error);
        await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅♀️🚫🛑🔞❗não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
        console.log('  -  🛑Not responded due to safety issues');
    }




    break
  } else if (transcriptionResult.status === 'error') {
    throw new Error(`Transcription failed: ${transcriptionResult.error}`)
  } else {
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}

} catch (error) {
    console.error('Error:', error);
    }
    }
    transcribeAudio();    } 
        if(m.message?.imageMessage ||
          m.message?.ephemeralMessage?.message?.imageMessage ||
          m.message?.viewOnceMessage?.message?.imageMessage ||
          m.message?.viewOnceMessageV2?.message?.imageMessage) {
            const mediaPath = './downloadade-media/';
            
            const buffer: Buffer = await downloadMediaMessage(
                m,
                'buffer',
                { },
                
            ) as Buffer; 
            try {
                   await fs.accessSync(mediaPath);
                }catch(error){
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                        //directory doesn't existe, create it
                       await fs.mkdirSync(mediaPath);
                    
                    } else{
                        //other error show log
                        console.error('error checking directory:', error);
                    }
                }
            
            const extension = "jpg";
            const fileName = new Date().getTime();
            const fullFileName = mediaPath + fileName + '.' + extension;
            //save file
            try{
                await fs.writeFileSync(fullFileName, buffer);
                console.log('  -  file downloaded succesfully as: ', fullFileName)
		await sock.sendMessage(id, {text: '✨SkayBot SightPro está pensando...'})
        const reactionMessage = {
            react: {
                text: "🤖", // use an empty string to remove the reaction
                key: m.key
            }
        }
        await sock.sendMessage(id, reactionMessage)
                console.log('  -  🖼️📸Image query on SkayBot SightPro: \n' + m.message?.imageMessage?.caption)
                if(extension !== "jpg"){
                    fs.unlink(fullFileName, () =>{});
                    console.log('file deleted');

                }
            }catch(error){
                console.error(error);
            }
         
/**
 * Asynchronously processes an image query by uploading the image, generating AI content,
 * and sending responses back to the user. Utilizes Google Generative AI for content
 * generation and Google Text-to-Speech for audio conversion.
 *
 * - Uploads the image to Google AI services and retrieves a URI for processing.
 * - Generates content based on image captions using a specified AI model.
 * - Sends AI-generated text back to the user via a messaging socket.
 * - Converts AI-generated text to audio using Google Text-to-Speech and sends it to the user.
 *
 * Handles errors and security issues gracefully, ensuring safe operations.
 */
            async function run() {
              const dispnm = new Date().getTime().toString();
              const fileManager = new GoogleAIFileManager(process.env.AI_API_KEY || ' ');
              const uploadResult = await fileManager.uploadFile(fullFileName, {
                mimeType: "image/jpeg",
                displayName: dispnm,
              });
              
              const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || ' ');
              const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings });
            
              const prompt = m.message?.imageMessage?.caption || m.message?.ephemeralMessage?.message?.imageMessage?.caption || m.message?.viewOnceMessage?.message?.imageMessage?.caption || m.message?.viewOnceMessageV2?.message?.imageMessage?.caption || ' ';
              console.log('  -  💫💭SkayBot SightPro is processing image query: \n' + prompt)
              const promptTwo = 'Responda apenas em português do brazil: ' +  prompt
              const result = await model.generateContent([
                { text: promptTwo },
                {
                  fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                  }
                },
              ]);
              const response = await result.response;
              
              try{
                const text = ('✨SkayBot SightPro:' + response.text())
                console.log('  -  ✅💬SightPro proceesing resulted in: \n' + text);
                await sock.sendMessage(id, { text: text}, { quoted: m});
                const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
            
            const prompt = response.text()
		
            const result = await model.generateContent('por favor resuma o assunto do texto a seguir em poucas palavras: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + 'asked AI with an image about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
                
                const msgname = m.messageTimestamp || 'audio'
                const msg = response.text()
                const mediaPath = './downloadade-media/';
                try {
                    await fs.accessSync(mediaPath);
                 }catch(error){
                     if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                         //directory doesn't existe, create it
                        await fs.mkdirSync(mediaPath);
                     
                     } else{
                         //other error show log
                         console.error('error checking directory:', error);
                     }
                 }
                async function convertTextToSpeech(msg: string) {
                    try {
                      const textToSpeechClient = new textToSpeech.TextToSpeechClient();
                  
                      const request = {
                        input: {text: msg},
                        voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                        audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
                      };
                  
                      // Perform the text-to-speech conversion
                      const [response] = await textToSpeechClient.synthesizeSpeech(request);
                  
                      // Return the audio data
                     // return response.audioContent;
                      const writeFile = util.promisify(fs.writeFile)
                      
      await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
      console.log('Audio content written to file: ' + msgname + '.mp3');
                    } catch (error){
                  console.error(error);
                  } 
                  }
                  const audioData = await convertTextToSpeech(msg);
                  // Function to send the TTS audio to the user
                  async function sendTextToSpeech() {  
                  try{  
                 // await client.sendMessage(message.from, audioData ,{ sendAudioAsVoice: true });
                 const filename = mediaPath + msgname + '.mp3';
                 await sock.sendMessage(
                    id, 
                    { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
                    //{ url: filename }, // can send mp3, mp4, & ogg
                )
                  } catch (error){
                  console.error(error);
                   }}
                    
                  await sendTextToSpeech();
                  
            } catch (error){
                console.error('security violation', error);
                await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅‍♀️🚫🛑🔞❗ não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
                console.log('  -  🛑not responded due to safety issues');
            }
            }
            run();
            
 }
 if(m.message?.videoMessage ||
  m.message?.viewOnceMessage?.message?.videoMessage ||
  m.message?.viewOnceMessageV2?.message?.videoMessage) {
    const mediaPath = './downloadade-media/';
    
    const buffer: Buffer = await downloadMediaMessage(
        m,
        'buffer',
        { },
        
    ) as Buffer; 
    try {
           await fs.accessSync(mediaPath);
        }catch(error){
            if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                //directory doesn't existe, create it
               await fs.mkdirSync(mediaPath);
            
            } else{
                //other error show log
                console.error('error checking directory:', error);
            }
        }
    
    const extension = "mp4";
    const fileName = new Date().getTime();
    const fullFileName = mediaPath + fileName + '.' + extension;
    //save file
    try{
        await fs.writeFileSync(fullFileName, buffer);
        console.log('  -  file downloaded succesfully as: ', fullFileName)
await sock.sendMessage(id, {text: '✨SkayBot SightPro está pensando...'})
const reactionMessage = {
    react: {
        text: "🤖", // use an empty string to remove the reaction
        key: m.key
    }
}
await sock.sendMessage(id, reactionMessage)
        console.log('  -  🖼️📸Image query on SkayBot SightPro: \n' + m.message?.imageMessage?.caption)
        if(extension !== "mp4"){
            fs.unlink(fullFileName, () =>{});
            console.log('file deleted');

        }
    }catch(error){
        console.error(error);
    } // Access your API key as an environment variable (see "Set up your API key" above)
    const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || ' ');
    
    // Converts local file information to a GoogleGenerativeAI.Part object.
    function fileToGenerativePart(path: string, mimeType: string) {
      return {
        inlineData: {
          data: Buffer.from(fs.readFileSync(path)).toString("base64"),
          mimeType
        },
      };
    }
    
    async function run() {
      //const dispnm = new Date().getTime().toString();
      const fileManager = new GoogleAIFileManager(process.env.AI_API_KEY || ' ');
      const uploadResult = await fileManager.uploadFile(fullFileName, {
        mimeType: "video/mp4",
        displayName: "video_" + fileName,
      });
      
      // View the response.
   console.log(`Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`);

      const getResult = await fileManager.getFile(uploadResult.file.name);
      console.log(`Retrieved file ${getResult.displayName} as ${getResult.uri}`);


      const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || ' ');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
      const video = {
        inlineData: {
          data: Buffer.from(fs.readFileSync(fullFileName)).toString("base64"),
          mimeType: "video/mp4",
        },
      };
      
      
      const prompt = m.message?.videoMessage?.caption || m.message?.ephemeralMessage?.message?.videoMessage?.caption || m.message?.viewOnceMessage?.message?.videoMessage?.caption || m.message?.viewOnceMessageV2?.message?.videoMessage?.caption || ' ';
      console.log('  -  💫💭SkayBot SightPro is processing image query: \n' + prompt)
      const result = await model.generateContent([
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: getResult.uri
          }
        },
        { text: prompt},
      ]);
      const response = await result.response;
      
      try{
        const text = ('✨SkayBot SightPro:' + response.text())
        console.log('  -  ✅💬SightPro proceesing resulted in: \n' + text);
        await sock.sendMessage(id, { text: text}, { quoted: m});
        const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
        
            const prompt = response.text()
		console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
            const result = await model.generateContent('por favor resuma o assunto do texto a seguir em poucas palavras: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + 'translated an audio about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
        
        const msgname = m.messageTimestamp || 'audio'
        const msg = response.text()
        const mediaPath = './downloadade-media/';
        try {
            await fs.accessSync(mediaPath);
         }catch(error){
             if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                 //directory doesn't existe, create it
                await fs.mkdirSync(mediaPath);
             
             } else{
                 //other error show log
                 console.error('error checking directory:', error);
             }
         }
        async function convertTextToSpeech(msg: string) {
            try {
              const textToSpeechClient = new textToSpeech.TextToSpeechClient();
          
              const request = {
                input: {text: msg},
                voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
              };
          
              // Perform the text-to-speech conversion
              const [response] = await textToSpeechClient.synthesizeSpeech(request);
          
              // Return the audio data
             // return response.audioContent;
              const writeFile = util.promisify(fs.writeFile)
              
await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
console.log('Audio content written to file: ' + msgname + '.mp3');
            } catch (error){
          console.error(error);
          } 
          }
          const audioData = await convertTextToSpeech(msg);
          // Function to send the TTS audio to the user
          async function sendTextToSpeech() {  
          try{  
         // await client.sendMessage(message.from, audioData ,{ sendAudioAsVoice: true });
         const filename = mediaPath + msgname + '.mp3';
         await sock.sendMessage(
            id, 
            { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
            //{ url: filename }, // can send mp3, mp4, & ogg
        )
          } catch (error){
          console.error(error);
           }}
            
          await sendTextToSpeech();
          
    } catch (error){
        console.error('security violation', error);
        await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅‍♀️🚫🛑🔞❗ não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
        console.log('  -  🛑not responded due to safety issues');
    }
    }
    run();
    
}

   
        if(m.message?.extendedTextMessage?.text?.startsWith('.') || m.message?.conversation?.startsWith('.')){
            await sock.sendMessage(id, {text: '✨SkayBot TalkPro está pensando...'});
            const reactionMessage = {
                react: {
                    text: "🤖", // use an empty string to remove the reaction
                    key: m.key
                }
            }
            await sock.sendMessage(id, reactionMessage)
		
            const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
           
            const msg = m.message.conversation?.slice(1) || m.message.extendedTextMessage?.text?.slice(1)
            const prompt = ('' + msg)
		console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
            const result = await model.generateContent(prompt);
            const response = await result.response;
           
            try{
                const text = ('✨SkayBot TalkPro: \n' + response.text())
                console.log('  -  ✅💬TalkPro query processed with response: \n' + text )
                await sock.sendMessage(id, { text: text}, { quoted: m});
                const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest", safetySettings});
            
            const prompt = response.text()
		console.log('  -  🆕🗨️New TalkPro query received: \n' + prompt + '\n  -  💫💭Processing query now...')
            const result = await model.generateContent('por favor resuma o assunto do texto a seguir em poucas palavras: ' + prompt);
            const response2 = await result.response;
           
            try{
                await sock.sendMessage(logid, {text: m.key.participant + ', ' + m.pushName + 'asked ai about: ' + response2.text()});
                }catch (error){
                  console.error('security violation', error);
                  console.log('  -  🛑Not responded due to safety issues');
              }
    
                const msgname = m.messageTimestamp || 'audio'
                const msg = response.text()
                const mediaPath = './downloadade-media/';
                try {
                    await fs.accessSync(mediaPath);
                 }catch(error){
                     if ((error as NodeJS.ErrnoException).code === 'ENOENT'){
                         //directory doesn't existe, create it
                        await fs.mkdirSync(mediaPath);
                     
                     } else{
                         //other error show log
                         console.error('error checking directory:', error);
                     }
                 }
                async function convertTextToSpeech(msg: string) {
                    try {
                      const textToSpeechClient = new textToSpeech.TextToSpeechClient();
                  
                      const request = {
                        input: {text: msg},
                        voice: {languageCode: "pt-BR", ssmlGender: 2}, // Set language code and gender as needed
                        audioConfig: {audioEncoding: 2}, // Set audio encoding as needed
                      };
                  
                      // Perform the text-to-speech conversion
                      const [response] = await textToSpeechClient.synthesizeSpeech(request);
                  
                      // Return the audio data
                     // return response.audioContent;
                      const writeFile = util.promisify(fs.writeFile)
                      
      await writeFile(mediaPath + msgname + '.mp3', Buffer.from(response.audioContent || ''), 'binary');
      console.log('Audio content written to file: ' + msgname + '.mp3');
                    } catch (error){
                  console.error(error);
                  } 
                  }
                  const audioData = await convertTextToSpeech(msg);
                  // Function to send the TTS audio to the user
                  async function sendTextToSpeech() {  
                  try{  
                 // await client.sendMessage(message.from, audioData ,{ sendAudioAsVoice: true });
                 const filename = mediaPath + msgname + '.mp3';
                 await sock.sendMessage(
                    id, 
                    { audio: { url: filename }, mimetype: 'audio/mp4', ptt: true }, { quoted: m}
                    //{ url: filename }, // can send mp3, mp4, & ogg
                )
                  } catch (error){
                  console.error(error);
                   }}
                    
                  await sendTextToSpeech();
            } catch (error){
                console.error('security violation', error);
                await sock.sendMessage(id, {text: '✨ 📢: \n🤬🤡🙅♀️🚫🛑🔞❗não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
                console.log('  -  🛑Not responded due to safety issues');
            }
            
       }}
}}})

}

function deleteFolderContents(folderPath: any) {
    try {
        const files = fs.readdirSync(folderPath);
        files.forEach((file) => {
            const filePath = path.join(folderPath, file);
            fs.unlinkSync(filePath);
        });
        console.log(`Contents of ${folderPath} deleted successfully.`);
    } catch (err) {
        console.error(`Error deleting contents of ${folderPath}:`, err);
    }
}

function scheduleFolderDeletion(folderPath: any, interval: any) {
    // Initial deletion
    deleteFolderContents(folderPath);

    // Schedule deletion every 'interval' milliseconds
    setInterval(() => {
        deleteFolderContents(folderPath);
    }, interval);
}

// Replace 'your/folder/path' with the actual path of the folder you want to clear
const folderPath = './downloadade-media/';
const deletionInterval = 20 * 60 * 1000; // 20 minutes in milliseconds

// Start the scheduled deletion
scheduleFolderDeletion(folderPath, deletionInterval);


connectToWhatsapp()
