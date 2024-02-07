import passportJWT from 'passport-jwt';
import passport from 'passport';
import  type{ Request } from 'express';


type JwtPayload = {
  userId: string;
  phoneNumber: string;
};
const JwtAccessStrategy  = passportJWT.Strategy;
const ExtractJwt = passportJWT.ExtractJwt;
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'asd';


passport.use('jwt-access', new JwtAccessStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtAccessSecret,
  passReqToCallback: true,
}, (req: Request, jwtPayload: JwtPayload, done) => {
  // we are adding accessToken into the payload before returning from this middleware
  // //  {userId: '65b6bcd71c72d773f5dbaa65',
  // phoneNumber: '437-556-4035',
  //   iat: 1706485225,
  //  exp: 1709077225,
  //  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NWI2YmNkNzFjNzJkNzczZjVkYmFhNjUiLCJwaG9uZU51bWJlciI6IjQzNy01NTYtNDAzNSIsIml
  // // hdCI6MTcwNjQ4NTIyNSwiZXhwIjoxNzA5MDc3MjI1fQ.dVTqgiaDgjBrgTw_6MgSa0zrqPl3vrsiwSLgR86h7vU'
  // // auth-service          | }
  const accessToken = req.get('Authorization')?.replace('Bearer', '').trim();
  done(null, { ...jwtPayload, accessToken });
}));

export default passport;
