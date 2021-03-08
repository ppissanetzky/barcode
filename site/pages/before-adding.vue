<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card width="375px">
          <v-card-title>Add a new item</v-card-title>
          <v-card-text>
            <p>
              Please choose what you would like to do:
            </p>
            <v-select
              v-model="action"
              :items="actions"
              clearable
              outlined
              hide-details
            />
          </v-card-text>

          <!-- When they got a frag -->
          <div v-if="action === 'received-dbtc'">
            <v-card-text>
              <p>
                Who gave you the frag?
              </p>
              <bc-user-autocomplete v-model="user" allow-all />
            </v-card-text>
            <div v-if="user">
              <v-card-text>
                <p>
                  Was it one of these?
                </p>
                <v-select
                  v-model="frag"
                  :items="frags"
                  item-value="fragId"
                  :loading="fragsLoading"
                  return-object
                  clearable
                  outlined
                  hide-details
                />
              </v-card-text>
              <v-card-text>
                <p v-if="receivedFragWithThread">
                  Click "continue" below and we'll post to the DBTC forum thread asking {{ user.name }} to update the item.
                </p>
                <p v-else>
                  You should talk to {{ user.name }} about the frag.
                </p>
              </v-card-text>
            </div>
          </div>

          <!-- When they want to contribute an item to DBTC -->

          <div v-if="action === 'dbtc'">
            <v-card-text>
              <p>
                Is there an existing DBTC forum thread already tracking this item?
              </p>
              <v-select
                v-model="threadExists"
                :items="threadChoices"
                clearable
                outlined
                hide-details
              />
            </v-card-text>
            <v-card-text v-if="threadExists === 'yes'">
              <p>
                Did you start the thread?
              </p>
              <v-select
                v-model="ownsTheThread"
                :items="starterChoices"
                clearable
                outlined
                hide-details
              />
            </v-card-text>
            <v-card-text v-if="threadExists === 'yes' && ownsTheThread === 'yes'">
              In that case, you should import the existing thread.
              Click "continue" below to run the thread import wizard.
            </v-card-text>
            <v-card-text v-if="threadExists === 'yes' && ownsTheThread === 'no'">
              If you didn't start the thread, the item cannot be imported by you.
              Get in touch with the member who started the thread.
              <p />
            </v-card-text>
          </div>

          <!-- The button to continue -->

          <v-card-text>
            <v-btn
              color="primary"
              :disabled="!canContinue"
              @click="submit"
            >
              Continue
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcUserAutocomplete from '../components/BcUserAutocomplete.vue'
export default {
  components: { BcUserAutocomplete },
  data: () => ({
    action: undefined,
    threadExists: undefined,
    ownsTheThread: undefined,
    user: undefined,
    frag: undefined,
    actions: [
      {
        value: 'received-dbtc',
        text: 'Update a DBTC frag you received from a member'
      },
      {
        value: 'private',
        text: 'Add an item to your private collection'
      },
      {
        value: 'dbtc',
        text: 'Contribute an item to the DBTC program'
      },
      {
        value: 'pif',
        text: 'Contribute a free item'
      }
    ],
    threadChoices: [
      {
        value: 'yes',
        text: 'Yes, a thread already exists'
      },
      {
        value: 'no',
        text: 'No, this is a brand new item'
      }
    ],
    starterChoices: [
      {
        value: 'yes',
        text: 'Yes, you started it'
      },
      {
        value: 'no',
        text: 'No, someone else started it'
      }
    ],
    fragsLoading: false,
    frags: []
  }),
  computed: {
    canContinue () {
      return this.action &&
        (
          this.action === 'private' ||
          this.action === 'pif' ||
          (
            this.action === 'dbtc' &&
            this.threadExists === 'no') ||
          (
            this.action === 'dbtc' &&
            this.threadExists === 'yes' &&
            this.ownsTheThread === 'yes') ||
          (
            this.receivedFragWithThread)
        )
    },
    receivedFragWithThread () {
      return this.action === 'received-dbtc' &&
        this.user && this.frag && this.frag.threadId
    }
  },
  watch: {
    action () {
      this.threadExists = undefined
      this.ownsTheThread = undefined
      this.user = undefined
      this.frags = []
      this.frag = undefined
    },
    threadExists () {
      this.ownsTheThread = undefined
      this.user = undefined
      this.frag = []
    },
    user () {
      if (this.user && this.action === 'received-dbtc') {
        this.fragsLoading = true
        const url = `/api/dbtc/frags/${this.user.id}`
        this.$axios.$get(url).then(({ frags }) => {
          for (const frag of frags) {
            frag.text = `${frag.name} (${frag.type})`
          }
          this.frags = frags
          this.fragsLoading = false
        })
      } else {
        this.frags = []
        this.frag = undefined
      }
    }
  },
  methods: {
    submit () {
      const { action } = this
      // In all of these cases, we move on to add a new item with rules populated
      if (action === 'private' || action === 'pif' || (action === 'dbtc' && this.threadExists === 'no')) {
        this.$router.replace({ path: 'add-new-item', query: { collection: action } })
        return
      }

      if (this.receivedFragWithThread) {
        const url = `/api/dbtc/received/${this.frag.fragId}/from/${this.user.id}`
        this.$axios.$put(url)
        this.$router.go(-1)
        return
      }

      // If the thread exists and this user started it, they can import it
      if (action === 'dbtc' && this.threadExists === 'yes' && this.ownsTheThread === 'yes') {
        this.$router.replace({ path: 'import' })
      }
    }
  }
}
</script>
