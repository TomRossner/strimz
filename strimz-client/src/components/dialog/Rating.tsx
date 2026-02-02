import {BsStarFill, BsStarHalf, BsStar} from "react-icons/bs";
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
            ? <span key={idx}><BsStarFill className="text-yellow-300" /></span>
            : (
                <span key={idx}>
                    {decimals > halfStarMinDecimalValue
                        ? <BsStarHalf className="text-yellow-300" />
                        : <BsStar className="text-yellow-300" />
                    }
                </span>
            )
    }

    return <span key={idx}><BsStar className="text-yellow-300" /></span>;
}

const Rating = ({rating}: RatingProps) => {
  if (rating === undefined || rating === null) {
    return (
      <span className="flex items-center gap-2 text-stone-500">
        No rating available
      </span>
    );
  }

  const ratingOutOf5 = rating / 2;
  return (
    <span className="flex items-center gap-2">
        <span className="flex items-center">
            {[...Array(MAX_STARS)].map((_: unknown, idx: number) =>
                ratingOutOf5 === MAX_STARS
                    ? <span key={idx}><BsStarFill className="text-yellow-300" /></span>
                    : calculateRating(idx, rating)
            )}
        </span>
        <span>({ratingOutOf5 % 1 === 0 ? ratingOutOf5 : ratingOutOf5.toFixed(1)} / {MAX_STARS})</span>
    </span>
  );
}

export default Rating;