import axios from "axios"
import { API_URL } from "./constants"

export const ping = async () => {
    return await axios.get(`${API_URL}/ping`);
}