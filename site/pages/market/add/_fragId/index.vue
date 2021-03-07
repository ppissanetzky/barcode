<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card v-if="frag" width="375px">
          <v-card-title>Add "{{ frag.name }}" to the market</v-card-title>
          <v-form ref="form" v-model="valid" :disabled="submitting">
            <v-card-text>
              <v-file-input
                v-if="pictureCount < 3"
                v-model="picture"
                outlined
                label="Add a picture"
                accept="image/*"
                prepend-icon=""
                hint="You can add up to 3 pictures"
                persistent-hint
                :rules="[pictureRequired]"
                @change="pictureChanged"
              />
              <v-sheet v-if="pictureCount" rounded outlined>
                <v-container fluid>
                  <v-row>
                    <v-col v-for="(p, index) in pictures" :key="index" cols="4">
                      <v-img
                        v-if="p.loading || p.src"
                        class="grey lighten-2"
                        aspect-ratio="1"
                        height="100px"
                        :src="p.src"
                      >
                        <v-container v-if="p.loading" fill-height>
                          <v-row justify="center" align="center">
                            <v-col cols="auto">
                              <v-progress-circular indeterminate />
                            </v-col>
                          </v-row>
                        </v-container>
                        <div v-else-if="p.src" class="text-right pa-0">
                          <v-btn icon :disabled="submitting" @click="removePicture(p.idx)">
                            <v-icon color="white">
                              mdi-close-circle
                            </v-icon>
                          </v-btn>
                        </div>
                      </v-img>
                    </v-col>
                  </v-row>
                </v-container>
              </v-sheet>
            </v-card-text>
            <v-card-text>
              <v-text-field
                v-model="title"
                :rules="[required]"
                label="Title"
                outlined
              />
              <v-textarea
                v-model="description"
                :rules="[required]"
                label="Description"
                outlined
                rows="6"
              />
              <v-text-field
                v-model="price"
                :rules="[required, validPrice]"
                label="Price"
                prefix="$"
                outlined
              />
              <v-text-field
                v-model="location"
                :rules="[required]"
                label="Pickup location"
                outlined
              />
              <p>
                You acquired the mother colony on <strong>{{ motherDate }}</strong> ({{ motherAge }} ago).
                If this is incorrect, please edit the mother colony and come back.
              </p>
              <p>
                Below, enter the date this particular frag was cut or split from the mother colony. Both dates will be shown in the market.
              </p>
              <bc-date-picker
                v-model="dateCut"
                :rules="[required]"
                label="Date the frag was cut"
                persistent-hint
                hint="This is the date you cut this particular frag"
                outlined
              />
            </v-card-text>
          </v-form>
          <v-card-text>
            <v-btn
              color="primary"
              :disabled="!valid"
              :loading="submitting"
              @click="submit"
            >
              Submit
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import BcDatePicker from '~/components/BcDatePicker.vue'
import { localeDateString, differenceToNow, utcIsoStringFromString } from '~/dates'
export default {
  components: { BcDatePicker },
  layout: 'market',
  async fetch () {
    const fragId = this.$route.params.fragId
    const { user, seller, frag, pictureSetId } = await this.$axios.$get(`/api/market/frag/${fragId}`)
    if (!seller) {
      return this.$router.replace({
        path: '/market/seller',
        query: { fragId }
      })
    }
    this.user = user
    this.seller = seller
    this.frag = frag
    this.pictureSetId = pictureSetId
    // Populate initial values from the frag
    this.title = frag.name
    this.location = user.location
  },

  data: () => ({
    // Inputs we get from the server
    user: {},
    seller: undefined,
    frag: undefined,
    pictureSetId: undefined,
    // Stuff the user enters
    title: undefined,
    description: undefined,
    dateCut: undefined,
    price: undefined,
    location: undefined,
    picture: undefined,
    pictures: [],
    // Submitting
    submitting: false,
    valid: false
  }),

  computed: {
    motherDate () {
      return this.frag ? localeDateString(this.frag.dateAcquired) : undefined
    },
    motherAge () {
      return this.frag ? differenceToNow(this.frag.dateAcquired) : undefined
    },
    pictureCount () {
      return this.pictures.length
    }
  },

  methods: {
    // Date functions
    localeDateString,
    differenceToNow,

    // Validation
    required (value) {
      if (!value) {
        return 'This field is required'
      }
      return true
    },
    beforeCutDate (value) {
      // TODO
      return true
    },
    validPrice (value) {
      if (!/^\d+$/.test(value)) {
        return 'The price must be a number with no decimals'
      }
      const price = parseInt(value, 10)
      if (isNaN(price) || price <= 0) {
        return 'That price looks goofy'
      }
      return true
    },
    pictureRequired () {
      if (!this.pictureCount) {
        return 'A picture is required'
      }
      return true
    },

    removePicture (idx) {
      // Remove it from the array
      this.pictures = this.pictures.filter(item => item.idx !== idx)
      // Now, call the server to delete it
      const url = `/api/market/picture/${this.pictureSetId}/${idx}`
      this.$axios.$delete(url).then(({ pictures }) => {
        this.pictures = pictures
        this.$refs.form.validate()
      })
      this.$refs.form.validate()
    },

    async submit () {
      this.submitting = true
      try {
        const formData = new FormData()
        formData.set('title', this.title)
        formData.set('description', this.description)
        formData.set('cutTimestamp', utcIsoStringFromString(this.dateCut))
        formData.set('price', this.price)
        formData.set('pictureSetId', this.pictureSetId)
        formData.set('location', this.location)
        const url = `/api/market/frag/${this.frag.fragId}`
        await this.$axios.$post(url, formData)
      } finally {
        this.submitting = false
      }
    },

    pictureChanged (file) {
      if (file) {
        this.pictures = [
          ...this.pictures,
          {
            loading: true
          }
        ]
        const formData = new FormData()
        formData.set('picture', file)
        const url = `/api/market/picture/${this.pictureSetId}`
        this.$axios.$post(url, formData).then(({ pictures }) => {
          this.pictures = pictures
        })
        // Now, remove the picture that was added to the input
        this.$nextTick(() => {
          this.picture = undefined
        })
      }
    }
  }
}
</script>
