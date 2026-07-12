import axios from 'axios';
async function test() {
  try {
    const res = await axios.delete('http://0.0.0.0:3000/api/periods/1');
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
