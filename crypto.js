import crypto from 'crypto';
const secret = 'bezkoder-secret-key';


export function encoderFactory(algorithm = 'sha256') {
  if (algorithm === 'none') {
    return function encode(password) {
      return password;
    }
  } else {
    return function encode(password) {
      let encoder;

      try {
        encoder = crypto
          .createHmac(algorithm, secret)
          .update(password)
          .digest("hex");
      } catch (e) {
        throw new Error(`${algorithm} is not supported`)
      }

      return encoder
    }
  }

}

export function validatorFactory(encode) {
  return function isValid(inputPassword, encryptedPassword) {
    const hash = encode(inputPassword);

    return hash === encryptedPassword;
  }
}
