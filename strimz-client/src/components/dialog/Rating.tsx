import {BsStarFill, BsStarHalf, BsStar} from "react-icons/bs";
// import {LiaImdb} from "react-icons/lia";
import React, { ReactElement } from "react";
import { MAX_STARS } from "../../utils/constants";

interface RatingProps {
    rating: number | undefined;
}


const calculateRating = (idx: number, rating: number): ReactElement => {
    const ratingHalf: number = rating / 2;
    const ratingHalfRounded: number = Math.floor(ratingHalf);

    const decimals: number = ratingHalf % 1;

    const halfStarMinDecimalValue = 0.3;
    const fullStarMinDecimalValue = 0.85;

    if (idx < ratingHalfRounded) return <span key={idx}><BsStarFill className="text-yellow-300" /></span>;
    
    if (idx === ratingHalfRounded) {
        return decimals > fullStarMinDecimalValue
            ? <span key={idx}><BsStar className="text-yellow-300" /></span>
            : (
                <span key={idx}>
                    {decimals > halfStarMinDecimalValue
                        ? <BsStarHalf className="text-yellow-300" />
                        : <BsStar className="text-yellow-300" />
                    }
                </span>
            )
    }

    return idx > ratingHalfRounded
        ? <span key={idx}><BsStar className="text-yellow-300" /></span>
        : <span key={idx}><BsStar className="text-yellow-300" /><BsStar className="text-yellow-300" /></span>;
}

// const starOutlined = 
// const starFilled = ;
// const starHalfFilled = ;

const Rating = ({rating}: RatingProps) => {
  return (
    <span className='flex items-center gap-2'>
        {/* <span><LiaImdb id="imdb"/></span> */}
        <span className="flex items-center">
            {[...Array(MAX_STARS)].map((_: unknown, idx: number) => {
                return (rating! / 2) === MAX_STARS
                    ? <span key={idx}><BsStarFill className="text-yellow-300" /></span>
                    : calculateRating(idx, rating!);
            })}
        </span>
        <span>({(rating! / 2)} / {MAX_STARS})</span>
    </span>
  )
}

export default Rating;