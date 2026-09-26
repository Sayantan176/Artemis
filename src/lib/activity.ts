import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "./firebase"

export async function logActivity(userId: string, type: 'url' | 'email' | 'message' | 'app', target: string, risk: string) {
  try {
    await addDoc(collection(db, "scans"), {
      userId,
      type,
      target,
      risk,
      timestamp: serverTimestamp()
    })
  } catch (error) {
    console.error("Failed to log activity:", error)
  }
}
