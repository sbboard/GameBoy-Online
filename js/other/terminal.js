function cout(message, colorIndex) {
  if (colorIndex < 0) return;
  switch (colorIndex) {
    case 0:
      console.log(message);
      break;
    case 1:
      console.warn(message);
      break;
    case 2:
      console.error(message);
      break;
    default:
      console.log(message);
  }
}
