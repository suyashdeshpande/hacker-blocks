import Ember from 'ember';
import moment from 'moment';
import config from '../../../config/environment';

const { inject: { service } } = Ember;

const chatApi = function(url){
  return config.chatEndpoint + '/'+ url;
};

export default Ember.Component.extend({
  didRenderDone: false,
  chat: service('chat'),
  messages: Ember.A([]),
  onlineUsers: Ember.A([]),
  session: service('session'),
  store: Ember.inject.service(),
  intervalId: null,
  init() {
    this._super(...arguments);
    if (!this.get('session.isAuthenticated')) {
      return;
    }
      var self = this;
      self.set('messages', Ember.A([]));
      let ids = [];
      Ember.$.ajax({
        method: "GET",
        url:chatApi('online')
      }).done(res => {
        res.data.forEach(user => {
          ids.push(user.user_id);
        });
        self.get('store').query('user', { user_id: ids, chat: true }).then(users => {
            users.forEach(user => {
              let myUserId = self.get('session.data.authenticated.user_id');
              if (user.get('id') !== String(myUserId)) {
                if (user.get('photo') === null || user.get('photo') === '') {
                  user.set('photo', '/images/student/random-avatar2.jpg');
                }
                let onlineUser = this.get('onlineUsers').find(onlineUser => {
                  return onlineUser.id === user.get('id');
                });
                if (!onlineUser) {
                  this.get('onlineUsers').pushObject(user);
                }
              }
            })
        });
      });

      this.get('chat').addChatListener((message) => {
        console.log(message.data.text);
        self.get('store').query('user', { user_id: message.data.user_id, chat: true, obj: true}).then(user => {
          console.log("user",user.photo);
          let photo = (user.photo === undefined)||(user.photo === '') || (user.photo === null) ? '/images/student/random-avatar2.jpg' : user.photo;
          console.log(photo);
          let messageObj = {
            text: message.data.text,
            senderName: user.name,
            senderPhoto: photo,
            sentTime: moment(message.sentTime).format('MMM Do YYYY, h:mm a')
          };
          this.get('messages').pushObject(messageObj);
          $("#chatbox").animate({ scrollTop: $('#chatbox').prop("scrollHeight") }, 1000);
        });
      });
      this.get('chat').addPresenceListener({
        join: (presence) => {
          self.get('store').queryRecord('user', { user_id: presence.user_id, chat: true, obj: true}).then(user => {
            let myUserId = self.get('session.data.authenticated.user_id');
            if (user.get('id') !== String(myUserId)) {
              if (user.get('photo') === null || user.get('photo') === '') {
                user.set('photo', '/images/student/random-avatar2.jpg');
              }
              let onlineUser = this.get('onlineUsers').find(onlineUser => {
                return onlineUser.id === user.get('id');
              });
              if (!onlineUser) {
                this.get('onlineUsers').pushObject(user);
              }
            }
          });
        },
        leave: (presence) => {
          let index = this.get('onlineUsers').findIndex(onlineUser => {
            return onlineUser.id === presence.user_id;
          });
          if (index >= 0) {
            this.get('onlineUsers').splice(index, 1);
            $('#' + presence.user_id).remove();
          }
        }
      });
      /*
      self.get('PN').history(config.GLOBAL_CHAT_NAME, res => {
        res.messages.forEach(message => {
          if(message.entry.sender !== null) {
            var photo = (message.entry.sender.photo === '') || (message.entry.sender.photo === null) ? '/images/student/random-avatar2.jpg' : message.entry.sender.photo;
            var sentTime = new Date(message.timetoken / 1e4);
            var obj = {
              text: message.entry.text,
              senderName: message.entry.sender.name,
              senderPhoto: photo,
              sentTime: moment(sentTime).format('MMM Do YYYY, h:mm a')
            };
            self.get('messages').pushObject(obj);
          }
        });
      });*/

      /*scroll down to latest message in inbox*/
      $('#chat-icon').click(() => {
        $("#chatbox").animate({ scrollTop: $('#chatbox').prop("scrollHeight") }, 1000);
      });
  },
  didRender() {
    this._super(...arguments);
    if (this.get('didRenderDone') === false) {
      $.AdminBSB.rightSideBar.activate();
      this.set('didRenderDone', true);

    }
    if (this.get('session.isAuthenticated')) {
      $('#chat-icon').click(() => {
        if (this.get('intervalId') !== null) {
          window.clearInterval(this.get('intervalId'));
        }
      });
    }
  },
  actions: {
    sendMessage() {
      let myUserId = this.get('session.data.authenticated.user_id');
        this.get('chat').publishMessage({ text: this.get('message'),user_id:myUserId,sentTime:moment().unix()});
        this.set('message', '');
    }
  },
  blinkChatIcon() {
    new Audio("/media/notification-tone.mp3").play();
    if (!$('#rightsidebar').hasClass('open')) {
      var intervalId = window.setInterval(function () {
        $('#chat-icon .material-icons').fadeTo('slow', 0.5).fadeTo('slow', 1.0);
      }, 2000);

      self.set('intervalId', intervalId);
    }
  }
});
