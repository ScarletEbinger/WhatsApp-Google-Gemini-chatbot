import makeWASocket, { BufferJSON, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as fs from 'fs'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function connectToWhatsapp(){
 console.log("hello");
 console.log("starting systems...");
 console.log("attempting to connect");
 console.log("pleas wait!");
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
        console.log("connected!")
    }
 })
 sock.ev.on('messages.upsert', async m => {
    console.log(JSON.stringify(m, undefined, 2))
    if (m.messages[0].key.fromMe === false){
    if(m.messages[0].key.remoteJid === 'INSERT GROUP ID HERE' ){
        const id = m.messages[0].key.remoteJid
        if(m.messages[0].message?.ephemeralMessage?.message?.extendedTextMessage?.text?.toLowerCase() === 'teste' || m.messages[0].message?.extendedTextMessage?.text?.toLowerCase() === 'teste' ){
            await sock.sendMessage(id, { text: 'tested'})
            console.log('message sent');
        }
        if(m.messages[0].message?.ephemeralMessage?.message?.extendedTextMessage?.text?.startsWith('!bot ') || m.messages[0].message?.extendedTextMessage?.text?.startsWith('!bot ')){
            //await sock.sendMessage(id, {text: 'bot2.0 estará disponivel em breve aguarde'});
            const genAI = new GoogleGenerativeAI('INSERT API KEY HERE');
            const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro"});
            const messageOne = m.messages[0].message?.ephemeralMessage?.message?.extendedTextMessage?.text?.toLowerCase();
            const messageTwo = m.messages[0].message?.extendedTextMessage?.text?.toLowerCase()
            const prompt = ('user: ' + messageOne?.slice(5) + messageTwo?.slice(5)) 
            const result = await model.generateContent(prompt);
            const response = await result.response;
            if (response.text() === null) {
                console.log('not responded due to safety issues');
            }else {
            const text = ('Google Gemini: \n' + response.text())
            await sock.sendMessage(id, { text: text});
        }}}
 }})

}
connectToWhatsapp()