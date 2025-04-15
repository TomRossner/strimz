import {Request, Response} from 'express';

export const handleLogin = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const {email, password} = req.body;
        

    } catch (error) {
        return res.status(400).send({error: 'Failed to log in'})
    }
}