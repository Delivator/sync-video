import Vue from 'vue';
import Vuetify from 'vuetify/lib';

const opts = {
  theme: {
    dark: true
  },
  icons: {
    iconfont: 'md',
  },
};

Vue.use(Vuetify);

export default new Vuetify(opts);
