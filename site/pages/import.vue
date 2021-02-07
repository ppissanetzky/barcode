<template>
  <v-stepper v-model="step" vertical>
    <!-- Step 1 - choose a thread -->
    <v-stepper-step step="1" :complete="step > 1">
      Choose a thread to import
    </v-stepper-step>
    <v-stepper-content step="1">
      <div v-if="!threads.length">
        <p>There's nothing left to import. Well done!</p>
        <v-btn
          small
          color="primary"
          to="/"
        >
          Home
        </v-btn>
      </div>
      <v-container v-else fluid>
        <p v-if="$vuetify.breakpoint.smAndDown">
          <i>It is strongly recommended that you do this on a larger screen. This could get frustrating...</i>
        </p>
        <p>
          Below are a few of your DBTC threads that have been active lately. There may be more, but let's start with these.
        </p>
        <v-list>
          <v-list-item-group v-model="selectedThreadIndex">
            <v-list-item v-for="t in threads" :key="t.threadId">
              <template v-slot:default="{ active }">
                <v-list-item-action>
                  <v-checkbox :input-value="active" />
                </v-list-item-action>
                <v-list-item-content>
                  <v-list-item-title>
                    {{ t.name }} ({{ t.type }})
                  </v-list-item-title>
                  <v-list-item-subtitle>Last post {{ t.lastPostAge }}</v-list-item-subtitle>
                  <v-list-item-subtitle>Created {{ t.startAge }}</v-list-item-subtitle>
                </v-list-item-content>
              </template>
            </v-list-item>
          </v-list-item-group>
        </v-list>
        <v-btn
          small
          color="primary"
          :disabled="typeof selectedThreadIndex !== 'number'"
          @click="leave(1)"
        >
          Continue
        </v-btn>
      </v-container>
    </v-stepper-content>

    <!-- Choose name and date acquired -->
    <v-stepper-step step="2" :complete="step > 2">
      Set the name and date acquired
    </v-stepper-step>
    <v-stepper-content step="2">
      <v-container fluid>
        <v-row>
          <v-col>
            The original title of <a :href="thread.viewUrl" target="_blank">this thread</a>
            was "{{ thread.title }}". Make sure the name of the item is correct below:
            now is a good time to correct spelling mistakes!
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-text-field
              v-model="name"
              outlined
              hide-details
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            This thread was created on {{ startDateString }} ({{ thread.startAge }}). Was the item acquired on this date or earlier?
          </v-col>
        </v-row>
        <v-row>
          <v-col v-if="step > 1">
            <bc-date-picker v-model="dateAcquired" :max="maxDateAcquired" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="auto">
            <v-btn
              small
              color="secondary"
              @click="--step"
            >
              Back
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn
              small
              color="primary"
              :disabled="!name"
              @click="leave(2)"
            >
              Continue
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-stepper-content>

    <v-stepper-step step="3" :complete="step > 3">
      Choose a picture
    </v-stepper-step>
    <v-stepper-content step="3">
      <v-container fluid>
        <!-- In case we find no pictures in the thread -->
        <div v-if="pictures.length === 0">
          <v-row>
            <v-col>
              I didn't find any pictures in the thread. Please upload one now.
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-file-input
                v-model="uploadedPicture"
                outlined
                label="Picture"
                accept="image/*"
                prepend-icon=""
                hide-details
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-checkbox v-model="sorryNoPic" label="I don't have a picture...I really don't..." />
            </v-col>
          </v-row>
        </div>
        <!-- We do have some pictures -->
        <div v-else>
          <v-item-group v-model="selectedPicture">
            <v-row>
              <v-col
                v-for="pic in pictures"
                :key="pic.url"
                cols="12"
                md="4"
              >
                <v-item v-slot="{ active, toggle }" :value="pic.url">
                  <v-img
                    :src="pic.url"
                    aspect-ratio="1"
                    class="text-right pa-2"
                    @click="toggle"
                  >
                    <v-btn small :color="active ? 'primary' : ''">
                      {{ active ? 'Good choice!' : 'Pick me!' }}
                    </v-btn>
                  </v-img>
                </v-item>
              </v-col>
            </v-row>
          </v-item-group>
        </div>
        <v-row>
          <v-col cols="auto">
            <v-btn
              small
              color="secondary"
              @click="--step"
            >
              Back
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn
              small
              color="primary"
              :disabled="!(selectedPicture || uploadedPicture || sorryNoPic)"
              @click="leave(3)"
            >
              Continue
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-stepper-content>

    <v-stepper-step step="4" :complete="step > 4">
      Review posts
    </v-stepper-step>
    <v-stepper-content step="4">
      <v-container fluid>
        <v-row>
          <v-col>
            Now, please review the individual posts in this thread and describe what happened below.
            Use the arrows to cycle through the posts.
            When you get to the last post, you'll be able to continue.
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            Posted by <strong>{{ you(post.user.name) }}</strong> on {{ postDateString }} - <a :href="post.viewUrl" target="_blank">see original post</a>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-textarea
              v-if="posts.length"
              v-model="post.text"
              outlined
              readonly
              hide-details
              rows="6"
              background-color="#F0F0F0"
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="auto">
            {{ postIndex + 1 }} of {{ posts.length }}
          </v-col>
          <v-col cols="auto">
            <v-btn
              small
              icon
              color="secondary"
              :disabled="postIndex === 0"
              @click="goToPreviousPost"
            >
              <v-icon>mdi-arrow-left-thick</v-icon>
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn
              small
              icon
              color="secondary"
              :disabled="postIndex >= posts.length - 1"
              @click="goToNextPost"
            >
              <v-icon>mdi-arrow-right-thick</v-icon>
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            Describe what happened in this post:
          </v-col>
        </v-row>
        <v-form ref="form" v-model="valid">
          <v-row>
            <v-col>
              <v-select
                v-model="transactions[postIndex].from"
                :items="peopleWithFrags"
                :rules="fromRules"
                outlined
                dense
                clearable
                placeholder="Nothing"
                @input="validate"
              />
            </v-col>
            <v-col>
              <v-select
                v-model="transactions[postIndex].type"
                :items="transactionTypes"
                :rules="typeRules"
                outlined
                dense
                clearable
                @input="validate"
              />
            </v-col>
            <v-col>
              <v-select
                v-model="transactions[postIndex].to"
                :items="mentionsWithoutFrags"
                :rules="toRules"
                outlined
                dense
                clearable
                @input="validate"
              />
            </v-col>
          </v-row>
        </v-form>
        <v-row>
          <v-col cols="auto">
            <v-btn
              small
              color="secondary"
              @click="--step"
            >
              Back
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn
              small
              color="primary"
              :disabled="postIndex < posts.length - 1 || !valid"
              @click="leave(4)"
            >
              Continue
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-stepper-content>

    <v-stepper-step step="5" :complete="step > 5">
      The finish line
    </v-stepper-step>
    <v-stepper-content step="5">
      <v-container fluid>
        <v-row>
          <v-col>
            <h3>
              On {{ dateString(dateAcquired) }}, ({{ dateAcquiredAge }}), you acquired this marvelous "{{ name }}" and decided to start sharing it.
            </h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-divider />
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <p
              v-for="d in descriptions"
              :key="d"
            >
              {{ d }}
            </p>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="auto">
            <v-btn
              small
              color="secondary"
              :disabled="saving"
              @click="--step"
            >
              Back
            </v-btn>
          </v-col>
          <v-col cols="auto">
            <v-btn
              small
              color="primary"
              :loading="saving"
              @click="leave(5)"
            >
              Finish
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-checkbox
              v-model="importAnother"
              label="and import another one"
              :disabled="saving"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-stepper-content>
  </v-stepper>
</template>
<script>
import { age, justTheLocalDate, dateFromIsoString, utcIsoStringFromString } from '~/dates'
import BcDatePicker from '~/components/BcDatePicker.vue'
export default {
  components: { BcDatePicker },
  async fetch () {
    const { user, threads } = await this.$axios.$get('/api/dbtc/imports')
    this.user = user
    this.threads = threads.slice(0, 5)
  },
  data () {
    return {
      user: {},
      threads: [],
      posts: [],
      pictures: [],
      uploadedPicture: undefined,
      selectedPicture: undefined,
      sorryNoPic: false,
      postIndex: 0,
      postText: undefined,
      promiseForPosts: undefined,
      loadingPosts: true,
      transactions: [{}],
      valid: false,
      fromRules: [value => this.validateTransaction('from')],
      typeRules: [value => this.validateTransaction('type')],
      toRules: [value => this.validateTransaction('to')],
      descriptions: [],
      step: 1,
      selectedThreadIndex: null,
      name: undefined,
      dateAcquired: undefined,
      startDateString: undefined,
      maxDateAcquired: undefined,
      importAnother: false,
      saving: false,
      transactionTypes: [
        { text: 'gave a frag to', value: 'gave' },
        { text: 'transferred their frag to', value: 'trans' },
        { text: 'reported their frag lost', value: 'rip' }
      ]
    }
  },
  computed: {
    thread () {
      return this.threads[this.selectedThreadIndex] || {}
    },
    post () {
      return this.posts[this.postIndex] || { user: {} }
    },
    postDateString () {
      return this.dateString(this.post.postDate)
    },
    mentionsWithoutFrags () {
      const result = []
      const post = this.post
      const haves = new Set(this.peopleWithFrags)
      if (post.user.id !== this.user.id && post.user.name) {
        if (!haves.has(post.user.name)) {
          result.push(post.user.name)
        }
      }
      if (post.mentions) {
        post.mentions.forEach(({ name }) => {
          if (!haves.has(name)) {
            result.push(name)
          }
        })
      }
      return result
    },
    peopleWithFrags () {
      // Start out with the current user since they have one
      const result = new Set()
      if (this.user.name) {
        result.add(this.you(this.user.name))
      }
      for (let i = 0; i < this.postIndex; ++i) {
        const { from, type, to } = this.transactions[i]
        switch (type) {
          case 'gave':
            if (to) {
              result.add(to)
            }
            break
          case 'rip':
            if (from) {
              result.delete(from)
            }
            break
          case 'trans':
            if (from && to) {
              result.delete(from)
              result.add(to)
            }
            break
        }
      }
      // console.log('WITH FRAGS', JSON.stringify([...result.values()]))
      return [...result.values()]
    },
    dateAcquiredAge () {
      return this.dateAcquired ? age(this.dateAcquired, 'today', 'ago') : ''
    }
  },
  methods: {
    you (name) {
      return name === this.user.name ? 'you' : name
    },
    dateString (date) {
      return date ? dateFromIsoString(date).toLocaleDateString() : ''
    },
    leave (step) {
      switch (step) {
        case 1: // Chose the thread
          // Start fetching the posts now
          this.loadingPosts = true
          this.promiseForPosts = this.$axios.$get(`/api/dbtc/imports/${this.thread.threadId}`)
          this.name = this.thread.name
          this.dateAcquired = justTheLocalDate(this.thread.startDate)
          this.startDateString = this.dateString(this.thread.startDate)
          this.maxDateAcquired = justTheLocalDate(this.thread.startDate)
          break
        case 2: // Edited the name and date acquired
          this.postIndex = 0
          this.promiseForPosts.then(({ posts }) => {
            this.loadingPosts = false
            this.posts = posts
            this.pictures = []
            this.uploadedPicture = undefined
            this.sorryNoPic = false
            this.selectedPicture = undefined
            this.posts.forEach((post, postIndex) => {
              post.attachments.forEach((url) => {
                if (this.pictures.length < 3) {
                  this.pictures.push({
                    url,
                    postIndex
                  })
                }
              })
            })
            // Add empty transactions to make things easier
            this.transactions = posts.map((post, postIndex) => ({
              from: '', type: '', to: '', postIndex
            }))
          })
          break
        case 3: // Selected pictures
          break
        case 4: // Reviewed posts
          this.importAnother = false
          this.descriptions = this.transactions.filter(({ type }) => type)
            .map(({ from, type, to, postIndex }) => {
              const post = this.posts[postIndex]
              const postDateString = this.dateString(post.postDate)
              switch (type) {
                case 'gave':
                  return `On ${postDateString}, ${this.you(from)} gave a frag to ${this.you(to)}.`
                case 'trans':
                  return `On ${postDateString}, ${this.you(from)} gave their frag to ${this.you(to)}.`
                case 'rip':
                  return `On ${postDateString}, ${this.you(from)} lost their frag.`
              }
            })
          break
        case 5:
          this.saveIt().then((motherId) => {
            if (this.importAnother) {
              this.$router.go()
            } else {
              this.$router.replace(`/kids/${motherId}`)
            }
          })
          return
      }
      // Go to the next step
      ++this.step
    },
    async saveIt () {
      this.saving = true
      const formData = new FormData()
      formData.set('threadId', this.thread.threadId)
      formData.set('name', this.name)
      formData.set('type', this.thread.type)
      formData.set('dateAcquired', utcIsoStringFromString(this.dateAcquired))
      if (this.selectedPicture) {
        formData.set('pictureUrl', this.selectedPicture)
      }
      if (this.uploadedPicture) {
        formData.set('picture', this.uploadedPicture)
      }
      // Build a map of users names to IDs
      const userMap = new Map([[this.user.name, this.user.id]])
      this.posts.forEach(({ user, mentions }) => {
        userMap.set(user.name, user.id)
        mentions.forEach(({ name, id }) => userMap.set(name, id))
      })
      // Converting 'you' back to this user's name
      const unyou = name => name === 'you' ? this.user.name : name
      // Now, build the transaction list
      const transactions = this.transactions
        .filter(({ type }) => type)
        .map(({ from, type, to, postIndex }) => ({
          date: this.posts[postIndex].postDate,
          from: unyou(from),
          fromId: userMap.get(unyou(from)),
          type,
          to: unyou(to),
          toId: to ? userMap.get(unyou(to)) : ''
        }))
      formData.set('transactions', JSON.stringify(transactions))
      // Do it
      const { motherId } = await this.$axios.$post('/api/dbtc/import', formData)
      return motherId
    },
    validateTransaction (field) {
      const t = this.transactions[this.postIndex]
      const { from, type, to } = t
      if (!from && !type && !to) {
        return true
      }
      if (from && type === 'rip' && !to) {
        return true
      }
      if (from && type && to) {
        return true
      }
      if (type === 'rip' && !to && field === 'to') {
        return true
      }
      if (!t[field]) {
        return 'This is required'
      }
      return true
    },
    goToPreviousPost () {
      this.$refs.form.reset()
      this.postIndex--
    },
    goToNextPost () {
      if (this.$refs.form.validate()) {
        this.postIndex++
      }
    },
    validate () {
      this.$refs.form.validate()
    }
  }
}
</script>
