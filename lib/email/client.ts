import 'server-only'
import type { TransactionalEmailMessage } from './templates'

export async function sendTransactionalEmail(input:{to:string;message:TransactionalEmailMessage;required?:boolean}){
// Trimmed: a trailing newline or stray space in the configured sender makes Resend
// reject the whole request with a 400, which is indistinguishable from a real outage.
const key=process.env.RESEND_API_KEY?.trim(),from=process.env.RESEND_FROM_EMAIL?.trim();const required=input.required!==false;if(!key||!from){if(required)throw new Error('EMAIL_CONFIG_MISSING');return false}const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({from,to:[input.to.trim().toLowerCase()],subject:input.message.subject,text:input.message.text})});if(!response.ok){if(required)throw new Error(`EMAIL_SEND_FAILED:${response.status}`);return false}return true}

// Sends up to 100 messages per provider call. Returns how many the provider accepted.
export async function sendTransactionalEmailBatch(input:{messages:{to:string;message:TransactionalEmailMessage}[];idempotencyKey?:string}){
const key=process.env.RESEND_API_KEY?.trim(),from=process.env.RESEND_FROM_EMAIL?.trim();if(!key||!from||!input.messages.length)return 0;let sent=0
for(let index=0;index<input.messages.length;index+=100){const chunk=input.messages.slice(index,index+100);try{const response=await fetch('https://api.resend.com/emails/batch',{method:'POST',signal:AbortSignal.timeout(15000),headers:{authorization:`Bearer ${key}`,'content-type':'application/json',...(input.idempotencyKey?{'Idempotency-Key':`${input.idempotencyKey}/${index}`}:{})},body:JSON.stringify(chunk.map(item=>({from,to:[item.to.trim().toLowerCase()],subject:item.message.subject,text:item.message.text})))});if(response.ok)sent+=chunk.length}catch{/* Delivery is best effort; the caller records the count. */}}
return sent}
