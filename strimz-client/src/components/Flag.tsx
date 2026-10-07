import al from 'svg-country-flags/svg/al.svg';
import ba from 'svg-country-flags/svg/ba.svg';
import bd from 'svg-country-flags/svg/bd.svg';
import bg from 'svg-country-flags/svg/bg.svg';
import br from 'svg-country-flags/svg/br.svg';
import cn from 'svg-country-flags/svg/cn.svg';
import cz from 'svg-country-flags/svg/cz.svg';
import de from 'svg-country-flags/svg/de.svg';
import dk from 'svg-country-flags/svg/dk.svg';
import ee from 'svg-country-flags/svg/ee.svg';
import es from 'svg-country-flags/svg/es.svg';
import fi from 'svg-country-flags/svg/fi.svg';
import fr from 'svg-country-flags/svg/fr.svg';
import gr from 'svg-country-flags/svg/gr.svg';
import hr from 'svg-country-flags/svg/hr.svg';
import hu from 'svg-country-flags/svg/hu.svg';
import id from 'svg-country-flags/svg/id.svg';
import il from 'svg-country-flags/svg/il.svg';
import ind from 'svg-country-flags/svg/in.svg';
import ir from 'svg-country-flags/svg/ir.svg';
import is from 'svg-country-flags/svg/is.svg';
import it from 'svg-country-flags/svg/it.svg';
import jp from 'svg-country-flags/svg/jp.svg';
import kh from 'svg-country-flags/svg/kh.svg';
import kr from 'svg-country-flags/svg/kr.svg';
import lk from 'svg-country-flags/svg/lk.svg';
import lt from 'svg-country-flags/svg/lt.svg';
import lv from 'svg-country-flags/svg/lv.svg';
import mk from 'svg-country-flags/svg/mk.svg';
import mm from 'svg-country-flags/svg/mm.svg';
import mn from 'svg-country-flags/svg/mn.svg';
import my from 'svg-country-flags/svg/my.svg';
import nl from 'svg-country-flags/svg/nl.svg';
import no from 'svg-country-flags/svg/no.svg';
import ph from 'svg-country-flags/svg/ph.svg';
import pk from 'svg-country-flags/svg/pk.svg';
import pl from 'svg-country-flags/svg/pl.svg';
import pt from 'svg-country-flags/svg/pt.svg';
import ro from 'svg-country-flags/svg/ro.svg';
import rs from 'svg-country-flags/svg/rs.svg';
import ru from 'svg-country-flags/svg/ru.svg';
import sa from 'svg-country-flags/svg/sa.svg';
import se from 'svg-country-flags/svg/se.svg';
import si from 'svg-country-flags/svg/si.svg';
import sk from 'svg-country-flags/svg/sk.svg';
import so from 'svg-country-flags/svg/so.svg';
import th from 'svg-country-flags/svg/th.svg';
import tr from 'svg-country-flags/svg/tr.svg';
import tw from 'svg-country-flags/svg/tw.svg';
import ua from 'svg-country-flags/svg/ua.svg';
import us from 'svg-country-flags/svg/us.svg';
import vn from 'svg-country-flags/svg/vn.svg';
import za from 'svg-country-flags/svg/za.svg';

const flags: Record<string, string> = {
    al, ba, bd, bg, br, cn, cz, de, dk, ee, es, fi, fr, gr, hr, hu, id, il,
    in: ind, ir, is, it, jp, kh, kr, lk, lt, lv, mk, mm, mn, my, nl, no, ph, pk, pl, pt,
    ro, rs, ru, sa, se, si, sk, so, th, tr, tw, ua, us, vn, za,
};

type FlagProps = {
    code?: string | null;
    title?: string;
    className?: string;
};

const Flag = ({ code, title, className }: FlagProps) => {
    const src = code ? flags[code.toLowerCase()] : '';
    if (!src) return null;

    return (
        <img
            src={src}
            alt=""
            title={title}
            className={className}
        />
    );
};

export default Flag;
