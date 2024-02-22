import makeWASocket, { BufferJSON, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config();


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
 sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    console.log(JSON.stringify(m, undefined, 2))
    if (m.key.fromMe === false){
    if(m.key.remoteJid === 'GROUP_ONE_HERE@g.us' || m.key.remoteJid === 'GROUP_TWO_HERE@g.us' ){
        const id = m.key.remoteJid
        const messageType = Object.keys (m.message || {})[0]// get what type of message it is -- text, image, video
        if(messageType === 'imageMessage') {
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
                console.log('file downloaded succesfully as: ', fullFileName)
                if(extension !== "jpg"){
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
              // For text-and-image input (multimodal), use the gemini-pro-vision model
              const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
            
              const prompt = m.message?.imageMessage?.caption?.toLowerCase() || ' ';
            
              const imageParts = [
                fileToGenerativePart(fullFileName, "image/jpeg"),
              ];
            
              const result = await model.generateContent([prompt, ...imageParts]);
              const response = await result.response;
              
              try{
                const text = ('Google Gemini: \n' + response.text())
                console.log(text);
                await sock.sendMessage(id, { text: text}, { quoted: m});
            } catch (error){
                console.error('security violation', error);
                await sock.sendMessage(id, {text: 'não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
                console.log('not responded due to safety issues');
            }
            }
            run();
            
 }

   // if(m.message?.ephemeralMessage?.message?.extendedTextMessage?.text?.toLowerCase() === 'teste' || m.message?.extendedTextMessage?.text?.toLowerCase() === 'teste' ){
   //         await sock.sendMessage(id, { text: 'tested'})
   //         console.log('message sent');
    //    }
        if(m.message?.ephemeralMessage?.message?.extendedTextMessage?.text?.startsWith('.') || m.message?.extendedTextMessage?.text?.startsWith('.')){
            //await sock.sendMessage(id, {text: 'bot2.0 estará disponivel em breve aguarde'});
            const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro"});
            //const messageOne = m.message.ephemeralMessage?.message?.extendedTextMessage?.text
           // const messageTwo = m.message.extendedTextMessage?.text || m.message.ephemeralMessage?.message?.extendedTextMessage?.text
          //const prompt = (' ' + messageTwo?.slice(1)) 
            const msg = m.message?.extendedTextMessage?.text?.slice(1) || m.message.ephemeralMessage?.message?.extendedTextMessage?.text?.slice(1)
            const prompt = ('' + msg)
            const result = await model.generateContent(prompt);
            const response = await result.response;
           
            try{
                const text = ('Google Gemini: \n' + response.text())
           
                await sock.sendMessage(id, { text: text}, { quoted: m});
            } catch (error){
                console.error('security violation', error);
                await sock.sendMessage(id, {text: 'não foi possivel responder devido a politicas de segurança da Google!'}, {quoted: m});
                console.log('not responded due to safety issues');
            }
            
       }}
 }})

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